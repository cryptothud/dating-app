'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { safety, type TrackingInfo } from '@/lib/safety'

const DARK_TILES = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

export default function TrackPage() {
  const { token } = useParams<{ token: string }>()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const [info, setInfo] = useState<TrackingInfo | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stopped = false

    const poll = async () => {
      while (!stopped) {
        try {
          const data = await safety.getTracking(token)
          if (!stopped) setInfo(data)
        } catch {
          if (!stopped) setError('Tracking link not found or expired.')
          break
        }
        await new Promise<void>((r) => setTimeout(r, 30000))
      }
    }

    void poll()
    return () => { stopped = true }
  }, [token])

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    mapInstance.current = new maplibregl.Map({
      container: mapRef.current,
      style: DARK_TILES,
      center: [-87.6298, 41.8781],
      zoom: 12,
    })
    mapInstance.current.addControl(new maplibregl.NavigationControl(), 'top-right')
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    if (!map || !info?.lat || !info?.lng) return

    const lngLat: [number, number] = [info.lng, info.lat]

    if (!markerRef.current) {
      const el = document.createElement('div')
      el.className = 'w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow-lg'
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map)
      map.flyTo({ center: lngLat, zoom: 14, speed: 0.8 })
    } else {
      markerRef.current.setLngLat(lngLat)
    }
  }, [info?.lat, info?.lng])

  const sos = info?.sosTriggered
  const ended = info?.ended

  return (
    <div className="min-h-[100dvh] bg-[#0d0a16] flex flex-col">
      {/* Header */}
      <div className={[
        'px-5 py-4 border-b',
        sos ? 'bg-red-900/60 border-red-700' : 'bg-[#1c1730] border-white/10',
      ].join(' ')}>
        <h1 className="font-display font-bold text-white text-lg">
          {sos ? '🚨 SOS Alert' : 'CRUSH Safety Tracking'}
        </h1>
        {info && (
          <p className="text-sm text-white/60 mt-0.5">
            {info.name}&apos;s location · Updated {info.updatedAt ? new Date(info.updatedAt).toLocaleTimeString() : 'never'}
          </p>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="absolute inset-0" />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0a16]">
            <p className="text-white/60 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Status bar */}
      {info && (
        <div className={[
          'px-5 py-4 border-t space-y-1',
          sos ? 'bg-red-900/60 border-red-700' : 'bg-[#1c1730] border-white/10',
        ].join(' ')}>
          {sos && (
            <p className="text-red-300 font-semibold text-sm">Emergency SOS has been triggered. Contact them immediately or call 911.</p>
          )}
          {ended && !sos && (
            <p className="text-green-400 text-sm font-medium">Session ended — {info.name} checked in safely.</p>
          )}
          {!sos && !ended && (
            <>
              <p className="text-white/80 text-sm">Check-in expected by {new Date(info.checkinAt).toLocaleTimeString()}</p>
              <p className="text-white/40 text-xs">Location is approximate (fuzzed for privacy). Updates every 30s.</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
