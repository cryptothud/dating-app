import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard'
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator'
import { EventsService, type EventSummary } from './events.service'
import { CreateEventDto } from './dto/create-event.dto'
import { MapEventsQueryDto } from './dto/map-events-query.dto'

@Controller('events')
export class EventsController {
  constructor(private events: EventsService) {}

  @Get('map')
  @UseGuards(OptionalJwtAuthGuard)
  getMapEvents(
    @Query() query: MapEventsQueryDto,
    @CurrentUser() user: AuthUser | null,
  ): Promise<EventSummary[]> {
    return this.events.getMapEvents(query, user?.id)
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  getEvent(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser | null,
  ): Promise<EventSummary & { isCreator: boolean }> {
    return this.events.getEvent(id, user?.id)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  createEvent(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto): Promise<EventSummary> {
    return this.events.createEvent(user.id, dto)
  }

  @Post(':id/rsvp')
  @UseGuards(JwtAuthGuard)
  rsvp(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ conversationId: string }> {
    return this.events.rsvp(id, user.id)
  }

  @Delete(':id/rsvp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelRsvp(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.events.cancelRsvp(id, user.id)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(@Param('id') id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.events.deleteEvent(id, user.id)
  }
}
