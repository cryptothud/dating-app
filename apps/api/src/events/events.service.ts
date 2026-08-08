import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PremiumService } from '../billing/premium.service'
import type { CreateEventDto } from './dto/create-event.dto'
import type { MapEventsQueryDto } from './dto/map-events-query.dto'

export interface EventSummary {
  id: string
  creatorId: string
  title: string
  description: string | null
  lat: number
  lng: number
  displayArea: string | null
  scheduledAt: string
  expiresAt: string
  maxAttendees: number | null
  rsvpCount: number
  hasRsvped: boolean
  conversationId: string | null
}

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private premium: PremiumService,
  ) {}

  async getMapEvents(query: MapEventsQueryDto, userId?: string): Promise<EventSummary[]> {
    const { swLat, swLng, neLat, neLng } = query
    const now = new Date()

    const events = await this.prisma.event.findMany({
      where: {
        expiresAt: { gt: now },
        latitude: { gte: swLat, lte: neLat },
        longitude: { gte: swLng, lte: neLng },
      },
      include: {
        rsvps: { select: { userId: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
    })

    return events.map((e) => ({
      id: e.id,
      creatorId: e.creatorId,
      title: e.title,
      description: e.description,
      lat: e.latitude,
      lng: e.longitude,
      displayArea: e.displayArea,
      scheduledAt: e.scheduledAt.toISOString(),
      expiresAt: e.expiresAt.toISOString(),
      maxAttendees: e.maxAttendees,
      rsvpCount: e.rsvps.length,
      hasRsvped: userId ? e.rsvps.some((r): boolean => r.userId === userId) : false,
      conversationId: null, // conversation looked up separately on detail fetch
    }))
  }

  async getEvent(eventId: string, userId?: string): Promise<EventSummary & { isCreator: boolean }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { rsvps: { select: { userId: true } } },
    })
    if (!event) throw new NotFoundException('Event not found')

    const hasRsvped = userId ? event.rsvps.some((r): boolean => r.userId === userId) : false

    // If the user has RSVPed, surface the group conversation ID
    let conversationId: string | null = null
    if (userId && hasRsvped) {
      const participant = await this.prisma.conversationParticipant.findFirst({
        where: {
          userId,
          conversation: { type: 'event' },
        },
        select: { conversationId: true },
      })
      conversationId = participant?.conversationId ?? null
    }

    return {
      id: event.id,
      creatorId: event.creatorId,
      title: event.title,
      description: event.description,
      lat: event.latitude,
      lng: event.longitude,
      displayArea: event.displayArea,
      scheduledAt: event.scheduledAt.toISOString(),
      expiresAt: event.expiresAt.toISOString(),
      maxAttendees: event.maxAttendees,
      rsvpCount: event.rsvps.length,
      hasRsvped,
      conversationId,
      isCreator: userId === event.creatorId,
    }
  }

  async createEvent(userId: string, dto: CreateEventDto): Promise<EventSummary> {
    await this.premium.requirePremium(userId)
    const scheduledAt = new Date(dto.scheduledAt)
    if (scheduledAt <= new Date())
      throw new BadRequestException('Event must be scheduled in the future')

    // Expire 4 hours after scheduled time
    const expiresAt = new Date(scheduledAt.getTime() + 4 * 60 * 60 * 1000)

    const event = await this.prisma.event.create({
      data: {
        creatorId: userId,
        title: dto.title,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        displayArea: dto.displayArea,
        scheduledAt,
        expiresAt,
        maxAttendees: dto.maxAttendees,
      },
      include: { rsvps: true },
    })

    return {
      id: event.id,
      creatorId: event.creatorId,
      title: event.title,
      description: event.description,
      lat: event.latitude,
      lng: event.longitude,
      displayArea: event.displayArea,
      scheduledAt: event.scheduledAt.toISOString(),
      expiresAt: event.expiresAt.toISOString(),
      maxAttendees: event.maxAttendees,
      rsvpCount: 0,
      hasRsvped: false,
      conversationId: null,
    }
  }

  async rsvp(eventId: string, userId: string): Promise<{ conversationId: string }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { rsvps: true },
    })
    if (!event) throw new NotFoundException('Event not found')
    if (event.expiresAt < new Date()) throw new BadRequestException('Event has expired')
    if (event.maxAttendees && event.rsvps.length >= event.maxAttendees) {
      throw new BadRequestException('Event is full')
    }

    const existing = event.rsvps.find((r): boolean => r.userId === userId)
    if (existing) {
      // Already RSVPed — just return their conversation
      const participant = await this.prisma.conversationParticipant.findFirst({
        where: { userId, conversation: { type: 'event' } },
        select: { conversationId: true },
      })
      return { conversationId: participant?.conversationId ?? '' }
    }

    // Find or create the event group conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        type: 'event',
        participants: { some: { userId: event.creatorId } },
      },
    })

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          type: 'event',
          participants: { create: { userId: event.creatorId } },
        },
      })
    }

    // Add user to RSVP + conversation in a transaction
    await this.prisma.$transaction([
      this.prisma.eventRsvp.create({ data: { eventId, userId } }),
      this.prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        create: { conversationId: conversation.id, userId },
        update: {},
      }),
    ])

    return { conversationId: conversation.id }
  }

  async cancelRsvp(eventId: string, userId: string): Promise<void> {
    const rsvp = await this.prisma.eventRsvp.findUnique({
      where: { eventId_userId: { eventId, userId } },
    })
    if (!rsvp) throw new NotFoundException('RSVP not found')
    await this.prisma.eventRsvp.delete({
      where: { eventId_userId: { eventId, userId } },
    })
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } })
    if (!event) throw new NotFoundException('Event not found')
    if (event.creatorId !== userId) throw new ForbiddenException()
    await this.prisma.event.delete({ where: { id: eventId } })
  }
}
