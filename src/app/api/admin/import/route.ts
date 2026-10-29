import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ImportRow = {
  title: string
  course_code: string
  year: number
  semester: string
  level: string
}

export async function POST(request: Request) {
  // Check admin session and role
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const adminCheck = createAdminClient()
  const { data: profile } = await adminCheck
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { rows } = body as { rows?: ImportRow[] }
  if (!Array.isArray(rows) || rows.length === 0) {
    return Response.json({ error: 'rows must be a non-empty array' }, { status: 400 })
  }

  const admin = createAdminClient()
  const errors: { row: number; reason: string }[] = []
  const papersToInsert: {
    title: string
    course_id: string
    year: number
    semester: 'first' | 'second' | 'resit'
    level: string
    file_path: string
    file_type: 'pdf'
    status: 'draft'
  }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    // Validate semester
    const validSemesters = ['first', 'second', 'resit'] as const
    if (!validSemesters.includes(row.semester as 'first' | 'second' | 'resit')) {
      errors.push({ row: rowNum, reason: `Invalid semester: ${row.semester}` })
      continue
    }

    // Look up course by code
    const { data: course, error: courseErr } = await admin
      .from('courses')
      .select('id')
      .eq('code', row.course_code)
      .maybeSingle()

    if (courseErr || !course) {
      errors.push({ row: rowNum, reason: `Course not found: ${row.course_code}` })
      continue
    }

    papersToInsert.push({
      title: row.title,
      course_id: course.id,
      year: row.year,
      semester: row.semester as 'first' | 'second' | 'resit',
      level: row.level,
      // Placeholder file path — bulk imported papers need a file uploaded separately
      file_path: `imports/placeholder-${Date.now()}-${rowNum}.pdf`,
      file_type: 'pdf',
      status: 'draft',
    })
  }

  let inserted = 0
  if (papersToInsert.length > 0) {
    const { data, error: insertErr } = await admin
      .from('papers')
      .insert(papersToInsert)
      .select('id')

    if (insertErr) {
      return Response.json(
        { error: insertErr.message, inserted: 0, errors },
        { status: 500 },
      )
    }

    inserted = data?.length ?? 0
  }

  // Fire-and-forget activity log
  fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/admin/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') ?? '' },
    body: JSON.stringify({
      action: 'papers_bulk_imported',
      details: { count: inserted },
    }),
  }).catch(() => {})

  return Response.json({ inserted, errors })
}
