'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, Feature, Point, Polygon } from 'geojson'
import { locationApi } from '@/lib/location'
import { eventsApi } from '@/lib/events'
import { useAuth } from '@/hooks/use-auth'
import { useSubscription } from '@/hooks/use-subscription'
import { MiniProfileCard } from './MiniProfileCard'
import { UserProfileDrawer } from './UserProfileDrawer'
import { ActivelyLookingButton } from './ActivelyLookingButton'
import { FilterPanel } from './FilterPanel'
import { EventPanel } from './EventPanel'
import type { MapUser, MapFilters, EventSummary } from '@dating-app/types'

const POLL_INTERVAL_MS = 30_000
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const LIGHT_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'
const DEFAULT_CENTER: [number, number] = [-74.006, 40.7128]
const DEFAULT_ZOOM = 13
const LAST_POS_KEY = 'crush_last_map_pos'

function readLastPos(): [number, number] | null {
  try {
    const raw = localStorage.getItem(LAST_POS_KEY)
    if (!raw) return null
    const { lng, lat } = JSON.parse(raw) as { lng: number; lat: number }
    if (typeof lng !== 'number' || typeof lat !== 'number') return null
    return [lng, lat]
  } catch {
    return null
  }
}

function writeLastPos(lat: number, lng: number): void {
  try {
    localStorage.setItem(LAST_POS_KEY, JSON.stringify({ lat, lng }))
  } catch {}
}

const COLOR_ONLINE = '#9333ea'
const COLOR_ACTIVE = '#f97316'
const COLOR_AWAY = '#6b7280'
const COLOR_SEEDED = '#6b7280'
const COLOR_EVENT = '#f59e0b'
const COLOR_VERIFIED_STROKE = '#22c55e'

function usersToGeoJSON(users: MapUser[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: users.map((u) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [u.lng, u.lat] },
      properties: {
        id: u.id,
        status: u.status,
        activelyLooking: u.activelyLooking,
        isVerified: u.isVerified,
        isSeeded: u.isSeeded,
        isBoosted: u.isBoosted ?? false,
        profileHighlight: u.profileHighlight ?? false,
        displayName: u.displayName ?? null,
        age: u.age ?? null,
        bodyType: u.bodyType ?? null,
        lookingFor: JSON.stringify(u.lookingFor ?? []),
        primaryPhotoUrl: u.primaryPhotoUrl ?? null,
        iconImage: `pfp-${u.id}`,
        lastActiveAt: u.lastActiveAt,
      },
    })),
  }
}

function createCircle(lng: number, lat: number, radiusMeters: number): Feature<Polygon> {
  const steps = 48
  const km = radiusMeters / 1000
  const R = 6371
  const latRad = (lat * Math.PI) / 180
  const coords: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * 2 * Math.PI
    const dLat = (km / R) * (180 / Math.PI) * Math.cos(angle)
    const dLng = ((km / R) * (180 / Math.PI) * Math.sin(angle)) / Math.cos(latRad)
    coords.push([lng + dLng, lat + dLat])
  }
  if (coords[0]) coords.push(coords[0])
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} }
}

const CLUSTER_ZOOM_THRESHOLD = 9

function clustersToGeoJSON(
  clusters: Array<{ lat: number; lng: number; count: number }>,
): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: clusters.map((c) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
      properties: { count: c.count },
    })),
  }
}

function eventsToGeoJSON(events: EventSummary[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: events.map((e) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [e.lng, e.lat] },
      properties: {
        id: e.id,
        title: e.title,
        rsvpCount: e.rsvpCount,
        hasRsvped: e.hasRsvped,
      },
    })),
  }
}

function loadCircularPfp(
  url: string,
): Promise<{ data: Uint8Array; width: number; height: number }> {
  const scale = Math.min(window.devicePixelRatio || 1, 3)
  const px = Math.round(40 * scale)
  // Proxy through Next.js image optimizer — same-origin request, no canvas CORS taint
  const src = `/_next/image?url=${encodeURIComponent(url)}&w=128&q=85`
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = px
      canvas.height = px
      const ctx = canvas.getContext('2d')!
      ctx.beginPath()
      ctx.arc(px / 2, px / 2, px / 2 - 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(img, 0, 0, px, px)
      ctx.beginPath()
      ctx.arc(px / 2, px / 2, px / 2 - 2, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = Math.max(2, Math.round(2 * scale))
      ctx.stroke()
      const raw = ctx.getImageData(0, 0, px, px)
      resolve({ data: new Uint8Array(raw.data.buffer), width: px, height: px })
    }
    img.onerror = reject
    img.src = src
  })
}

function getInitials(name: string | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]
  const last = parts[parts.length - 1]
  if (parts.length >= 2 && first && last) {
    return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
  }
  return first?.[0]?.toUpperCase() ?? '?'
}

function createInitialsPlaceholder(
  initials: string,
  bgColor: string,
  scale: number,
): { data: Uint8Array; width: number; height: number } {
  const px = Math.round(40 * scale)
  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')!
  ctx.beginPath()
  ctx.arc(px / 2, px / 2, px / 2 - 1, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, px, px)
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${Math.round(px * 0.38)}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, px / 2, px / 2 + 1)
  ctx.beginPath()
  ctx.arc(px / 2, px / 2, px / 2 - 1, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = Math.max(2, Math.round(2 * scale))
  ctx.stroke()
  const raw = ctx.getImageData(0, 0, px, px)
  return { data: new Uint8Array(raw.data.buffer), width: px, height: px }
}

function queueProfileImageLoads(
  map: maplibregl.Map,
  users: MapUser[],
  loaded: Set<string>,
  pending: Set<string>,
): void {
  const scale = Math.min(window.devicePixelRatio || 1, 3)
  for (const u of users) {
    const id = `pfp-${u.id}`
    if (loaded.has(id) || pending.has(id)) continue

    const addInitials = () => {
      const initials = getInitials(u.displayName)
      const bgColor = u.activelyLooking
        ? COLOR_ACTIVE
        : u.status === 'online'
          ? COLOR_ONLINE
          : COLOR_AWAY
      try {
        const img = createInitialsPlaceholder(initials, bgColor, scale)
        if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio: scale })
        loaded.add(id)
      } catch {
        /* map not ready */
      }
    }

    if (u.primaryPhotoUrl) {
      pending.add(id)
      void loadCircularPfp(u.primaryPhotoUrl)
        .then((img) => {
          try {
            if (!map.getCanvas()) return
            if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio: scale })
            loaded.add(id)
          } catch {
            /* map destroyed between load and addImage */
          }
        })
        .catch(addInitials)
        .finally(() => {
          pending.delete(id)
        })
    } else {
      addInitials()
    }
  }
}

function setupLayers(map: maplibregl.Map): void {
  for (const layer of [
    'cluster-count',
    'clusters',
    'highlight-ring',
    'looking-pulse',
    'unclustered-point',
    'unclustered-pfp',
    'event-pins',
    'fuzz-zone-fill',
    'fuzz-zone-outline',
    'server-cluster-circle',
    'server-cluster-count',
  ]) {
    if (map.getLayer(layer)) map.removeLayer(layer)
  }
  for (const source of ['users', 'events', 'my-fuzz-zone', 'server-clusters']) {
    if (map.getSource(source)) map.removeSource(source)
  }

  // Animated pulse ring — shown around "actively looking" users.
  // pixelRatio:2 → CSS icon size = PULSE_SIZE/2.
  // PFP icons are 40 CSS px (40px @ pixelRatio:scale). At pixelRatio:2 in this
  // canvas, 1 CSS px = 2 canvas px, so the PFP occupies a 80-canvas-px diameter.
  // Start the ring at 40 canvas px radius (PFP edge) and expand outward.
  const PULSE_SIZE = 120
  let pulseCanvas: HTMLCanvasElement | null = null
  let pulseCtx: CanvasRenderingContext2D | null = null
  const pulseImage: maplibregl.StyleImageInterface = {
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    data: new Uint8Array(PULSE_SIZE * PULSE_SIZE * 4),
    onAdd() {
      pulseCanvas = document.createElement('canvas')
      pulseCanvas.width = PULSE_SIZE
      pulseCanvas.height = PULSE_SIZE
      pulseCtx = pulseCanvas.getContext('2d')
    },
    render() {
      if (!pulseCtx || !pulseCanvas) return false
      const t = (performance.now() / 1000) % 1
      const s = PULSE_SIZE
      pulseCtx.clearRect(0, 0, s, s)
      // Expand from PFP edge (40 canvas px) outward to 56 canvas px
      const radius = 40 + 16 * t
      const opacity = (1 - t) * 0.9
      pulseCtx.beginPath()
      pulseCtx.arc(s / 2, s / 2, radius, 0, Math.PI * 2)
      pulseCtx.strokeStyle = `rgba(249, 115, 22, ${opacity})`
      pulseCtx.lineWidth = Math.max(1.5, 4 - t * 3)
      pulseCtx.stroke()
      const raw = pulseCtx.getImageData(0, 0, s, s)
      ;(this as { data: Uint8Array }).data = new Uint8Array(raw.data.buffer)
      map.triggerRepaint()
      return true
    },
  }
  if (map.hasImage('looking-pulse')) map.removeImage('looking-pulse')
  map.addImage('looking-pulse', pulseImage, { pixelRatio: 2 })

  // Fuzz zone — drawn below user dots to reassure users their exact GPS isn't shown
  map.addSource('my-fuzz-zone', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: 'fuzz-zone-fill',
    type: 'fill',
    source: 'my-fuzz-zone',
    paint: { 'fill-color': '#9333ea', 'fill-opacity': 0.07 },
  })
  map.addLayer({
    id: 'fuzz-zone-outline',
    type: 'line',
    source: 'my-fuzz-zone',
    paint: {
      'line-color': '#9333ea',
      'line-opacity': 0.35,
      'line-width': 1.5,
      'line-dasharray': [4, 3],
    },
  })

  map.addSource('users', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 8,
    clusterRadius: 30,
  })

  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'users',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': COLOR_ONLINE,
      'circle-radius': ['step', ['get', 'point_count'], 18, 10, 26, 50, 34],
      'circle-opacity': 0.85,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.3,
    },
  })

  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'users',
    filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
    paint: { 'text-color': '#ffffff' },
  })

  map.addLayer({
    id: 'highlight-ring',
    type: 'circle',
    source: 'users',
    filter: ['all', ['!', ['has', 'point_count']], ['boolean', ['get', 'profileHighlight'], false]],
    paint: {
      'circle-radius': 14,
      'circle-color': 'transparent',
      'circle-stroke-width': 3,
      'circle-stroke-color': '#f59e0b',
      'circle-stroke-opacity': 0.7,
    },
  })

  // Pulse ring for "actively looking" users — rendered below the dot/photo layers
  map.addLayer({
    id: 'looking-pulse',
    type: 'symbol',
    source: 'users',
    filter: ['all', ['!', ['has', 'point_count']], ['boolean', ['get', 'activelyLooking'], false]],
    layout: {
      'icon-image': 'looking-pulse',
      'icon-size': 1,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })

  map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: 'users',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': ['case', ['boolean', ['get', 'isBoosted'], false], 10, 8],
      'circle-color': [
        'case',
        ['boolean', ['get', 'activelyLooking'], false],
        COLOR_ACTIVE,
        ['==', ['get', 'status'], 'online'],
        COLOR_ONLINE,
        ['==', ['get', 'status'], 'away'],
        COLOR_AWAY,
        COLOR_SEEDED,
      ],
      'circle-opacity': ['case', ['==', ['get', 'status'], 'seeded'], 0.5, 1],
      'circle-stroke-width': ['case', ['boolean', ['get', 'isVerified'], false], 2, 0],
      'circle-stroke-color': COLOR_VERIFIED_STROKE,
    },
  })

  // Symbol layer renders actual profile photos on top of the circle dots.
  // MapLibre auto-redraws when addImage() is called, so photos pop in as they load.
  map.addLayer({
    id: 'unclustered-pfp',
    type: 'symbol',
    source: 'users',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': ['coalesce', ['get', 'iconImage'], ''],
      'icon-size': 1,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })

  // Server-side clusters — used at zoom < 12 for accurate counts (no API row limit)
  map.addSource('server-clusters', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })

  map.addLayer({
    id: 'server-cluster-circle',
    type: 'circle',
    source: 'server-clusters',
    layout: { visibility: 'none' },
    paint: {
      'circle-color': COLOR_ONLINE,
      'circle-radius': ['step', ['get', 'count'], 16, 10, 22, 50, 28, 200, 36],
      'circle-opacity': 0.85,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.3,
    },
  })

  map.addLayer({
    id: 'server-cluster-count',
    type: 'symbol',
    source: 'server-clusters',
    layout: {
      visibility: 'none',
      'text-field': ['to-string', ['get', 'count']],
      'text-size': 12,
    },
    paint: { 'text-color': '#ffffff' },
  })

  map.addSource('events', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })

  map.addLayer({
    id: 'event-pins',
    type: 'circle',
    source: 'events',
    paint: {
      'circle-radius': 10,
      'circle-color': COLOR_EVENT,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.9,
    },
  })
}

function featureToUser(feature: maplibregl.MapGeoJSONFeature): MapUser | null {
  const p = feature.properties
  if (!p) return null
  const coords = (feature.geometry as Point).coordinates
  return {
    id: String(p['id']),
    lat: coords[1] as number,
    lng: coords[0] as number,
    status: (p['status'] as MapUser['status']) ?? 'away',
    activelyLooking: Boolean(p['activelyLooking']),
    isVerified: Boolean(p['isVerified']),
    isSeeded: Boolean(p['isSeeded']),
    displayName: p['displayName'] ?? undefined,
    age: p['age'] ?? undefined,
    bodyType: p['bodyType'] ?? undefined,
    lookingFor: p['lookingFor'] ? (JSON.parse(p['lookingFor'] as string) as string[]) : [],
    primaryPhotoUrl: p['primaryPhotoUrl'] ?? undefined,
    lastActiveAt: p['lastActiveAt'] as string,
  }
}

export function MapView(): React.JSX.Element {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const myMarkerRef = useRef<maplibregl.Marker | null>(null)
  const myDotElRef = useRef<HTMLDivElement | null>(null)
  const activelyLookingRef = useRef(false)
  const myGpsRef = useRef<{ lat: number; lng: number } | null>(null)
  const fuzzRadiusRef = useRef<number>(500)
  const appliedStyleRef = useRef<string>('')
  const hasInitialCenteredRef = useRef(false)
  const lastLocationUpdateRef = useRef<number>(0)
  const startedAtCachedPosRef = useRef(false)
  const watchIdRef = useRef<number | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const filtersRef = useRef<MapFilters>({})
  const currentUserIdRef = useRef<string | undefined>(undefined)
  const loadedPfpRef = useRef<Set<string>>(new Set())
  const pendingPfpRef = useRef<Set<string>>(new Set())

  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventSummary | null>(null)
  const [events, setEvents] = useState<EventSummary[]>([])
  const [activelyLooking, setActivelyLooking] = useState(false)
  const [activelyLookingExpiresAt, setActivelyLookingExpiresAt] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<MapFilters>({})
  const [locationDenied, setLocationDenied] = useState(false)
  const [hasGps, setHasGps] = useState(false)

  const { resolvedTheme } = useTheme()
  const { isAuthenticated, isLoading, user } = useAuth()
  const { isPremium } = useSubscription(isAuthenticated)
  currentUserIdRef.current = user?.id

  activelyLookingRef.current = activelyLooking
  useEffect(() => {
    const el = myDotElRef.current
    if (!el) return
    el.classList.toggle('crush-you-dot--active', activelyLooking)
  }, [activelyLooking])

  const activeFilterCount = [
    filters.ageMin !== undefined || filters.ageMax !== undefined,
    (filters.lookingFor?.length ?? 0) > 0,
    filters.activelyOnly,
    !!filters.bodyType,
  ].filter(Boolean).length

  const fetchUsers = useCallback(async (): Promise<void> => {
    const map = mapRef.current
    if (!map) return
    const bounds = map.getBounds()
    if (!bounds) return
    const zoom = map.getZoom()
    // Expand bounds by the max fuzz radius (≈1.5 km) so that users whose real
    // coordinates are near the viewport edge still get returned — their fuzzed
    // position is what's visible, and these must never diverge. Without this,
    // a user can pan until an icon disappears and triangulate the exact real GPS.
    const PAD = 0.014
    const viewport = {
      swLat: bounds.getSouth() - PAD,
      swLng: bounds.getWest() - PAD,
      neLat: bounds.getNorth() + PAD,
      neLng: bounds.getEast() + PAD,
      zoom,
    }
    try {
      const useServerClusters = zoom < CLUSTER_ZOOM_THRESHOLD
      const userSrc = map.getSource<maplibregl.GeoJSONSource>('users')
      const clusterSrc = map.getSource<maplibregl.GeoJSONSource>('server-clusters')
      const eventSrc = map.getSource<maplibregl.GeoJSONSource>('events')

      const individualLayers = [
        'clusters',
        'cluster-count',
        'highlight-ring',
        'unclustered-point',
        'unclustered-pfp',
      ]
      const serverClusterLayers = ['server-cluster-circle', 'server-cluster-count']

      if (useServerClusters) {
        const [clusters, evts] = await Promise.all([
          locationApi.getClusters(viewport),
          eventsApi.getMapEvents(viewport),
        ])
        userSrc?.setData({ type: 'FeatureCollection', features: [] })
        clusterSrc?.setData(clustersToGeoJSON(clusters))
        for (const l of individualLayers) {
          if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', 'none')
        }
        for (const l of serverClusterLayers) {
          if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', 'visible')
        }
        eventSrc?.setData(eventsToGeoJSON(evts))
        setEvents(evts)
      } else {
        const [users, evts] = await Promise.all([
          locationApi.getMap(viewport, filtersRef.current),
          eventsApi.getMapEvents(viewport),
        ])
        clusterSrc?.setData({ type: 'FeatureCollection', features: [] })
        for (const l of serverClusterLayers) {
          if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', 'none')
        }
        for (const l of individualLayers) {
          if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', 'visible')
        }
        const othersOnly = currentUserIdRef.current
          ? users.filter((u) => u.id !== currentUserIdRef.current)
          : users
        userSrc?.setData(usersToGeoJSON(othersOnly))
        eventSrc?.setData(eventsToGeoJSON(evts))
        setEvents(evts)
        queueProfileImageLoads(map, othersOnly, loadedPfpRef.current, pendingPfpRef.current)
      }
    } catch {
      /* non-fatal */
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initialStyle = resolvedTheme === 'dark' ? DARK_STYLE : LIGHT_STYLE
    appliedStyleRef.current = initialStyle
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: (() => {
        const p = readLastPos()
        startedAtCachedPosRef.current = p !== null
        return p ?? DEFAULT_CENTER
      })(),
      zoom: DEFAULT_ZOOM,
      maxZoom: 16,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    // Suppress noisy vector-tile parse errors (out-of-bounds index, malformed tiles)
    map.on('error', () => {
      /* noop */
    })

    map.once('load', () => {
      setupLayers(map)
      mapRef.current = map
      setMapReady(true)
    })

    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
      const feature = features[0]
      if (!feature) return
      const clusterId = feature.properties?.['cluster_id'] as number
      const src = map.getSource<maplibregl.GeoJSONSource>('users')
      if (!src) return
      void src.getClusterExpansionZoom(clusterId).then((zoom) => {
        const coords = (feature.geometry as Point).coordinates as [number, number]
        map.easeTo({ center: coords, zoom })
      })
    })

    map.on('click', 'server-cluster-circle', (e) => {
      const feature = e.features?.[0]
      if (!feature) return
      const coords = (feature.geometry as Point).coordinates as [number, number]
      map.easeTo({ center: coords, zoom: Math.min(map.getZoom() + 3, 14) })
    })

    map.on('click', 'unclustered-point', (e) => {
      const feature = e.features?.[0]
      if (!feature) return
      const u = featureToUser(feature)
      if (u) setSelectedUser(u)
    })

    map.on('click', 'unclustered-pfp', (e) => {
      const feature = e.features?.[0]
      if (!feature) return
      const u = featureToUser(feature)
      if (u) setSelectedUser(u)
    })

    map.on('click', 'event-pins', (e) => {
      const feature = e.features?.[0]
      if (!feature || !feature.properties) return
      const eventId = feature.properties['id'] as string
      const found = events.find((ev) => ev.id === eventId)
      if (found) setSelectedEvent(found)
    })

    for (const layer of [
      'clusters',
      'server-cluster-circle',
      'unclustered-point',
      'unclustered-pfp',
      'event-pins',
    ]) {
      map.on('mouseenter', layer, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layer, () => {
        map.getCanvas().style.cursor = ''
      })
    }

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
      myMarkerRef.current?.remove()
      myMarkerRef.current = null
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync map style with theme
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const target = resolvedTheme === 'dark' ? DARK_STYLE : LIGHT_STYLE
    // Skip if this style is already applied — calling setStyle with the same URL
    // tears down all sources/layers, creating a race where GPS fires during the
    // reload and finds the fuzz-zone source missing.
    if (appliedStyleRef.current === target) return
    appliedStyleRef.current = target
    map.setStyle(target)
    map.once('styledata', () => {
      loadedPfpRef.current.clear()
      pendingPfpRef.current.clear()
      setupLayers(map)
      const gps = myGpsRef.current
      if (gps) {
        const fuzzSrc = map.getSource<maplibregl.GeoJSONSource>('my-fuzz-zone')
        fuzzSrc?.setData({
          type: 'FeatureCollection',
          features: [createCircle(gps.lng, gps.lat, fuzzRadiusRef.current)],
        })
      }
      void fetchUsers()
    })
  }, [resolvedTheme, mapReady, fetchUsers])

  // Keep filtersRef in sync for fetchUsers closure
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  // Location tracking + polling
  useEffect(() => {
    if (!mapReady) return

    if (isAuthenticated && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async ({ coords }) => {
          const { latitude, longitude } = coords
          const map = mapRef.current
          if (!map) return

          writeLastPos(latitude, longitude)

          // First fix: fly to location only if map didn't already start at a cached position
          if (!hasInitialCenteredRef.current) {
            hasInitialCenteredRef.current = true
            setHasGps(true)
            if (!startedAtCachedPosRef.current) {
              map.flyTo({ center: [longitude, latitude], zoom: DEFAULT_ZOOM, duration: 1200 })
            }
          }

          // "You" dot: use a Marker (DOM element) — survives theme changes, no GeoJSON source needed
          if (!myMarkerRef.current) {
            const el = document.createElement('div')
            el.className = 'crush-you-dot'
            el.title = 'You — click to edit profile'
            el.addEventListener('click', () => {
              window.location.href = '/profile'
            })
            myDotElRef.current = el
            if (activelyLookingRef.current) el.classList.add('crush-you-dot--active')
            myMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
              .setLngLat([longitude, latitude])
              .addTo(map)
          } else {
            myMarkerRef.current.setLngLat([longitude, latitude])
          }

          // Fuzz zone circle — shows the blur radius so users know their exact GPS isn't shown
          myGpsRef.current = { lat: latitude, lng: longitude }
          const fuzzSrc = map.getSource<maplibregl.GeoJSONSource>('my-fuzz-zone')
          fuzzSrc?.setData({
            type: 'FeatureCollection',
            features: [createCircle(longitude, latitude, fuzzRadiusRef.current)],
          })

          const now = Date.now()
          if (now - lastLocationUpdateRef.current >= 60_000) {
            lastLocationUpdateRef.current = now
            try {
              await locationApi.update(latitude, longitude)
            } catch {
              /* refresh handled in api.ts */
            }
          }
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setLocationDenied(true)
        },
        { enableHighAccuracy: true, maximumAge: 10000 },
      )
    }

    fetchUsers()
    mapRef.current?.on('moveend', fetchUsers)
    pollRef.current = setInterval(fetchUsers, POLL_INTERVAL_MS)

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
      mapRef.current?.off('moveend', fetchUsers)
    }
  }, [mapReady, isAuthenticated, fetchUsers])

  // Re-fetch when filters change
  useEffect(() => {
    if (mapReady) void fetchUsers()
  }, [filters, mapReady, fetchUsers])

  // Fetch fuzz radius so the circle on the map reflects the user's chosen blur
  useEffect(() => {
    if (!isAuthenticated || isLoading) return
    locationApi
      .getMyLocation()
      .then((loc) => {
        if (loc?.fuzzRadius) fuzzRadiusRef.current = loc.fuzzRadius
      })
      .catch(() => {})
  }, [isAuthenticated, isLoading])

  // Load actively-looking status
  useEffect(() => {
    if (!isAuthenticated || isLoading) return
    locationApi
      .getActivelyLooking()
      .then(({ enabled, expiresAt }) => {
        setActivelyLooking(enabled)
        setActivelyLookingExpiresAt(expiresAt)
      })
      .catch(() => {
        /* not fatal */
      })
  }, [isAuthenticated, isLoading])

  async function handleToggleActivelyLooking(next: boolean): Promise<void> {
    await locationApi.setActivelyLooking(next)
    setActivelyLooking(next)
    setActivelyLookingExpiresAt(next ? new Date(Date.now() + 2 * 3600 * 1000).toISOString() : null)
  }

  function handleMessage(userId: string): void {
    setSelectedUser(null)
    router.push(`/messages/${userId}`)
  }

  // Re-register event-pins click when events state changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    type LayerHandler = (
      e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] } & object,
    ) => void
    const handler: LayerHandler = (e) => {
      const feature = e.features?.[0]
      if (!feature?.properties) return
      const eventId = feature.properties['id'] as string
      const found = events.find((ev) => ev.id === eventId)
      if (found) setSelectedEvent(found)
    }
    map.off('click', 'event-pins', handler)
    map.on('click', 'event-pins', handler)
    return () => {
      map.off('click', 'event-pins', handler)
    }
  }, [events, mapReady])

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {!mapReady && (
        <div className="bg-background absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-muted-foreground text-sm">Loading map…</p>
          </div>
        </div>
      )}

      {locationDenied && isAuthenticated && (
        <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-amber-500/90 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 shrink-0 fill-none stroke-current"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Location blocked — enable it in your browser to appear on the map
        </div>
      )}

      {mapReady && (
        <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
          <button
            onClick={() => {
              setShowFilters((s) => !s)
              setSelectedUser(null)
              setSelectedEvent(null)
            }}
            className={[
              'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold shadow-md transition-colors',
              activeFilterCount > 0
                ? 'bg-primary text-white'
                : 'bg-background/90 text-foreground border-border hover:bg-muted/80 border backdrop-blur',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 fill-none stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] leading-none text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {isAuthenticated && hasGps && (
            <button
              title="Go to my location"
              onClick={() => {
                const gps = myGpsRef.current
                if (gps)
                  mapRef.current?.flyTo({
                    center: [gps.lng, gps.lat],
                    zoom: DEFAULT_ZOOM,
                    duration: 800,
                  })
              }}
              className="bg-background/90 border-border text-foreground hover:bg-muted/80 flex h-8 w-8 items-center justify-center rounded-xl border shadow-md backdrop-blur transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {showFilters && (
          <FilterPanel
            filters={filters}
            onChange={(f) => {
              setFilters(f)
            }}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedUser &&
          (isAuthenticated ? (
            <UserProfileDrawer
              key={selectedUser.id}
              userId={selectedUser.id}
              displayName={selectedUser.displayName ?? null}
              lastActiveAt={selectedUser.lastActiveAt}
              activelyLooking={selectedUser.activelyLooking}
              distanceMiles={
                myGpsRef.current
                  ? (() => {
                      const R = 6371
                      const toRad = (d: number) => (d * Math.PI) / 180
                      const dLat = toRad(selectedUser.lat - myGpsRef.current.lat)
                      const dLng = toRad(selectedUser.lng - myGpsRef.current.lng)
                      const a =
                        Math.sin(dLat / 2) ** 2 +
                        Math.cos(toRad(myGpsRef.current.lat)) *
                          Math.cos(toRad(selectedUser.lat)) *
                          Math.sin(dLng / 2) ** 2
                      return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 1.60934
                    })()
                  : undefined
              }
              onClose={() => setSelectedUser(null)}
              onMessage={handleMessage}
            />
          ) : (
            <MiniProfileCard
              key={selectedUser.id}
              user={selectedUser}
              isAuthenticated={isAuthenticated}
              onClose={() => setSelectedUser(null)}
              onMessage={handleMessage}
            />
          ))}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEvent && (
          <EventPanel
            event={selectedEvent}
            isAuthenticated={isAuthenticated}
            isPremium={isPremium}
            onClose={() => setSelectedEvent(null)}
            onRsvpChange={(updated) => {
              setSelectedEvent(updated)
              setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
            }}
          />
        )}
      </AnimatePresence>

      {isAuthenticated && hasGps && (
        <ActivelyLookingButton
          active={activelyLooking}
          expiresAt={activelyLookingExpiresAt}
          onToggle={handleToggleActivelyLooking}
        />
      )}
    </div>
  )
}
