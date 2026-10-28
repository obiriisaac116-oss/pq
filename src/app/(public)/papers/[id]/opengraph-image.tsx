import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const alt = 'Past paper';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: paper } = await supabase
    .from('papers')
    .select('title, year, semester, courses(code)')
    .eq('id', params.id)
    .eq('status', 'published')
    .maybeSingle();

  const course = paper?.courses as { code: string } | null;
  const title = paper?.title ?? 'Past Examination Paper';
  const code = course?.code ?? '';
  const year = paper?.year ?? '';
  const semester = paper?.semester ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#1d4ed8',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        <p
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '24px',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          PastQuestions GH
        </p>
        <h1
          style={{
            color: 'white',
            fontSize: '52px',
            fontWeight: 'bold',
            lineHeight: 1.2,
            margin: 0,
            maxWidth: '1000px',
          }}
        >
          {title}
        </h1>
        <div style={{ display: 'flex', gap: '24px', marginTop: '32px' }}>
          {code && (
            <span
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '100px',
                fontSize: '24px',
              }}
            >
              {code}
            </span>
          )}
          {year && (
            <span
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '100px',
                fontSize: '24px',
              }}
            >
              {year}
            </span>
          )}
          {semester && (
            <span
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '8px 20px',
                borderRadius: '100px',
                fontSize: '24px',
                textTransform: 'capitalize',
              }}
            >
              {semester} Semester
            </span>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
