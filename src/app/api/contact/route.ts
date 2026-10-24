// src/app/api/contact/route.ts
//
// POST — contact form submission. Phase 4 stub; full implementation in Phase 6.

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'Not implemented yet' },
    { status: 501 },
  )
}
