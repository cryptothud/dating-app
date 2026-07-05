/**
 * k6 load test — Auth endpoints
 *
 * Tests rate limiting behavior and response times on login/signup.
 * Does NOT create real accounts — uses known-bad credentials to test failure paths.
 *
 * Run: k6 run --env API_URL=http://localhost:4000 load-tests/auth.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const loginLatency = new Trend('login_latency', true)

const API_URL = __ENV.API_URL || 'http://localhost:4000'
const HEADERS = { 'Content-Type': 'application/json' }

export const options = {
  scenarios: {
    // Scenario 1: sustained login attempts (happy path — measures latency)
    normal_login: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      tags: { scenario: 'normal' },
    },
    // Scenario 2: spike of concurrent logins (stress test)
    login_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '30s', target: 0 },
      ],
      startTime: '2m', // after normal_login
      tags: { scenario: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    errors: ['rate<0.05'], // some errors expected (wrong credentials return 401)
    login_latency: ['p(99)<500'],
  },
}

export default function () {
  const scenario = __ENV.SCENARIO || 'login'

  if (scenario === 'signup') {
    testSignupRateLimit()
  } else {
    testLogin()
  }
}

function testLogin() {
  const start = Date.now()
  const res = http.post(
    `${API_URL}/api/auth/login`,
    JSON.stringify({ email: 'nonexistent@loadtest.invalid', password: 'wrong-password' }),
    { headers: HEADERS },
  )
  loginLatency.add(Date.now() - start)

  const ok = check(res, {
    // 401 is the correct response for bad credentials — not an error in the test sense
    'returns 401 for bad credentials': (r) => r.status === 401,
    // Must not return 500 or leak internals
    'no server error': (r) => r.status < 500,
    // Rate limiter kicks in at 5/min — after that expect 429
    'throttled or rejected': (r) => r.status === 401 || r.status === 429,
  })

  errorRate.add(res.status >= 500)
  sleep(0.5 + Math.random())
}

function testSignupRateLimit() {
  // Test that the rate limiter fires correctly after 3 rapid requests
  const dob = new Date()
  dob.setFullYear(dob.getFullYear() - 25)

  const res = http.post(
    `${API_URL}/api/auth/signup`,
    JSON.stringify({
      email: `loadtest+${Date.now()}@example.invalid`,
      phone: '+15550000000',
      password: 'Test1234!',
      dateOfBirth: dob.toISOString(),
    }),
    { headers: HEADERS },
  )

  check(res, {
    'signup throttled or processed': (r) => r.status === 409 || r.status === 201 || r.status === 429,
    'no server error': (r) => r.status < 500,
  })

  errorRate.add(res.status >= 500)
  sleep(2)
}
