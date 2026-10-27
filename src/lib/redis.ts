// src/lib/redis.ts
//
// Upstash Redis singleton + rate-limit instances.
//
// Both instances use the sliding-window algorithm:
//   - contactRatelimit:  3 submissions per IP per 60 minutes.
//   - downloadRatelimit: 30 downloads per IP per 60 minutes.
//
// The Redis instance is created once at module level (re-used across requests
// in the same server process). @upstash/redis uses HTTP/REST so it is
// compatible with Next.js Edge runtime and serverless environments.

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const contactRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 m'),
  prefix: 'rl:contact',
})

export const downloadRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '60 m'),
  prefix: 'rl:download',
})

export const subscribeRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 m'),
  prefix: 'rl:subscribe',
})
