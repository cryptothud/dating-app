/**
 * k6 load test — GET /api/location/map
 *
 * Simulates users panning the map while active sessions are updating locations.
 * Run: k6 run --env API_URL=http://localhost:4000 load-tests/map.js
 *
 * Targets (adjust thresholds to match SLA):
 *   - p95 response < 500ms under 200 concurrent users
 *   - error rate < 1%
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const mapLatency = new Trend('map_query_latency', true)

const API_URL = __ENV.API_URL || 'http://localhost:4000'

// Phoenix, AZ bounding box — a realistic starting viewport
const VIEWPORTS = [
  { swLat: 33.40, swLng: -112.12, neLat: 33.50, neLng: -112.00 },
  { swLat: 33.42, swLng: -112.10, neLat: 33.52, neLng: -111.98 },
  { swLat: 33.44, swLng: -112.08, neLat: 33.54, neLng: -111.96 },
  { swLat: 33.46, swLng: -112.06, neLat: 33.56, neLng: -111.94 },
  // NYC — second city test
  { swLat: 40.70, swLng: -74.02, neLat: 40.75, neLng: -73.96 },
  { swLat: 40.72, swLng: -74.00, neLat: 40.77, neLng: -73.94 },
]

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // ramp up
    { duration: '2m', target: 200 },   // sustained load
    { duration: '1m', target: 400 },   // spike
    { duration: '30s', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
    map_query_latency: ['p(99)<1000'],
  },
}

export default function () {
  const vp = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)]
  const url = `${API_URL}/api/location/map?swLat=${vp.swLat}&swLng=${vp.swLng}&neLat=${vp.neLat}&neLng=${vp.neLng}`

  const start = Date.now()
  const res = http.get(url, {
    headers: { Accept: 'application/json' },
    // Anonymous request — no auth cookie. Mirrors anonymous map browsing.
  })
  mapLatency.add(Date.now() - start)

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'returns array': (r) => {
      try {
        const body = JSON.parse(r.body)
        return Array.isArray(body)
      } catch {
        return false
      }
    },
    'response under 500ms': (r) => r.timings.duration < 500,
  })

  errorRate.add(!ok)
  sleep(Math.random() * 2 + 1) // 1-3s think time between pans
}
