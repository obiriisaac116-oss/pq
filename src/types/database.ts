// src/types/database.ts
//
// Manual TypeScript types mirroring supabase/migrations/001_schema.sql, in the
// shape expected by `createClient<Database>` from @supabase/supabase-js
// (Tables / Views / Functions per schema, with Row/Insert/Update per table).
//
// Schema notes (these intentionally follow the Phase 2 schema spec):
//   - `papers.level` is a `text` column, so it is typed `string` here (the
//     original plan sketched a numeric union, but the column stores text).
//   - `papers.semester`, `papers.file_type` and `profiles.role` are stored as
//     `text` with no database CHECK; they are typed as string-literal unions
//     matching the application's Zod validation. Only `papers.status` is
//     enforced by a CHECK constraint at the database level.
//   - `papers.search_vec` is a GENERATED tsvector column: it appears in Row
//     only (you cannot insert or update it).
//   - There is no `file_size` column in this schema.

// -----------------------------------------------------------------------------
// profiles
// -----------------------------------------------------------------------------
export type ProfilesRow = {
  id: string
  role: 'student' | 'admin'
  full_name: string | null
  avatar_url: string | null
  updated_at: string
}

export type ProfilesInsert = {
  id: string
  role?: 'student' | 'admin'
  full_name?: string | null
  avatar_url?: string | null
  updated_at?: string
}

export type ProfilesUpdate = {
  id?: string
  role?: 'student' | 'admin'
  full_name?: string | null
  avatar_url?: string | null
  updated_at?: string
}

// -----------------------------------------------------------------------------
// courses
// -----------------------------------------------------------------------------
export type CoursesRow = {
  id: string
  code: string
  name: string
  programme: string | null
  created_at: string
}

export type CoursesInsert = {
  id?: string
  code: string
  name: string
  programme?: string | null
  created_at?: string
}

export type CoursesUpdate = {
  id?: string
  code?: string
  name?: string
  programme?: string | null
  created_at?: string
}

// -----------------------------------------------------------------------------
// papers
// -----------------------------------------------------------------------------
export type PapersRow = {
  id: string
  title: string
  course_id: string | null
  year: number | null
  semester: 'first' | 'second' | 'resit' | null
  level: string | null
  file_path: string
  file_type: 'pdf' | 'jpg' | 'png'
  status: 'published' | 'draft'
  downloads: number
  search_vec: string
  created_at: string
  updated_at: string
  archived: boolean
  tags: string[] | null
  publish_at: string | null
}

export type PapersInsert = {
  id?: string
  title: string
  course_id?: string | null
  year?: number | null
  semester?: 'first' | 'second' | 'resit' | null
  level?: string | null
  file_path: string
  file_type: 'pdf' | 'jpg' | 'png'
  status?: 'published' | 'draft'
  downloads?: number
  created_at?: string
  updated_at?: string
  archived?: boolean
  tags?: string[] | null
  publish_at?: string | null
}

export type PapersUpdate = {
  id?: string
  title?: string
  course_id?: string | null
  year?: number | null
  semester?: 'first' | 'second' | 'resit' | null
  level?: string | null
  file_path?: string
  file_type?: 'pdf' | 'jpg' | 'png'
  status?: 'published' | 'draft'
  downloads?: number
  created_at?: string
  updated_at?: string
  archived?: boolean
  tags?: string[] | null
  publish_at?: string | null
}

// -----------------------------------------------------------------------------
// contact_messages
// -----------------------------------------------------------------------------
export type ContactMessagesRow = {
  id: string
  name: string
  email: string
  message: string
  created_at: string
  read: boolean
}

export type ContactMessagesInsert = {
  id?: string
  name: string
  email: string
  message: string
  created_at?: string
  read?: boolean
}

export type ContactMessagesUpdate = {
  id?: string
  name?: string
  email?: string
  message?: string
  created_at?: string
  read?: boolean
}

// -----------------------------------------------------------------------------
// subscribers
// -----------------------------------------------------------------------------
export type SubscribersRow = {
  id: string
  email: string
  created_at: string
  confirmed: boolean
}

export type SubscribersInsert = {
  id?: string
  email: string
  created_at?: string
  confirmed?: boolean
}

export type SubscribersUpdate = {
  id?: string
  email?: string
  confirmed?: boolean
}

// -----------------------------------------------------------------------------
// activity_log
// -----------------------------------------------------------------------------
export type ActivityLogRow = {
  id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
}

export type ActivityLogInsert = {
  id?: string
  action: string
  details?: Record<string, unknown> | null
  created_at?: string
}

// -----------------------------------------------------------------------------
// paper_ratings
// -----------------------------------------------------------------------------
export type PaperRatingsRow = {
  id: string
  paper_id: string
  session_id: string
  rating: number
  created_at: string
}

export type PaperRatingsInsert = {
  id?: string
  paper_id: string
  session_id: string
  rating: number
  created_at?: string
}

export type PaperRatingsUpdate = {
  rating?: number
}

// -----------------------------------------------------------------------------
// Database (compatible with createClient<Database>)
// -----------------------------------------------------------------------------
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow
        Insert: ProfilesInsert
        Update: ProfilesUpdate
        Relationships: []
      }
      courses: {
        Row: CoursesRow
        Insert: CoursesInsert
        Update: CoursesUpdate
        Relationships: []
      }
      papers: {
        Row: PapersRow
        Insert: PapersInsert
        Update: PapersUpdate
        Relationships: [
          {
            foreignKeyName: 'papers_course_id_fkey'
            columns: ['course_id']
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
        ]
      }
      contact_messages: {
        Row: ContactMessagesRow
        Insert: ContactMessagesInsert
        Update: ContactMessagesUpdate
        Relationships: []
      }
      subscribers: {
        Row: SubscribersRow
        Insert: SubscribersInsert
        Update: SubscribersUpdate
        Relationships: []
      }
      paper_ratings: {
        Row: PaperRatingsRow
        Insert: PaperRatingsInsert
        Update: PaperRatingsUpdate
        Relationships: [
          {
            foreignKeyName: 'paper_ratings_paper_id_fkey'
            columns: ['paper_id']
            referencedRelation: 'papers'
            referencedColumns: ['id']
          },
        ]
      }
      activity_log: {
        Row: ActivityLogRow
        Insert: ActivityLogInsert
        Update: Partial<ActivityLogInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      increment_downloads: {
        Args: { paper_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
