You are a senior full-stack engineer. Build a production-ready "Past Questions" website for university students, following the architecture below exactly.

GOAL
Students browse, search and download past exam questions. The admin (me) logs in to upload and manage them. Anyone can contact me through a form.

TECH STACK
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS, server-rendered for SEO
- Backend: Next.js API routes with Zod validation
- Database, auth and file storage: Supabase (PostgreSQL, Auth, Storage)
- Email: Resend
- Search: PostgreSQL full-text search (upgrade path to Meilisearch)
- Hosting: Vercel, with Cloudflare in front
- Tests: Vitest for logic, Playwright for the main flows

FEATURES
Public:
1. Home page with search bar and filters: programme, course code, level, year, semester
2. Results list with pagination, and a detail page for each paper with a download button
3. Contact page: name, email, message, plus WhatsApp and phone links
4. Fully responsive, mobile first, fast on slow networks

Admin (role protected):
1. Secure login
2. Upload form: title, course code, level, year, semester, PDF or image
3. Edit, delete and publish/unpublish papers
4. View contact messages

DATABASE
Tables: profiles (role), courses, papers (title, course_id, year, semester, level, file_path, status, downloads, created_at), contact_messages.
Add Row Level Security: the public can only read published papers, and only admins can write.

SECURITY AND QUALITY
- Validate everything server-side; allow only PDF, JPG and PNG, max 10 MB
- Rate-limit the contact form and add spam protection (honeypot field plus Turnstile)
- Presigned uploads straight to storage
- Environment variables for all secrets, with a .env.example
- Proper loading, empty and error states on every page
- Accessible (labels, keyboard navigation, contrast)

HOW TO WORK
Work in this order, and finish each step completely, with no errors, before moving on:
1. Project setup and folder structure
2. Database schema and security rules (SQL)
3. Authentication and admin role
4. Admin upload and management
5. Public browse, search and download
6. Contact form and email
7. Tests, then deployment steps

Give me exact commands (I use Linux), full code for every file, and a short checklist to confirm each step works before the next. Ask me one question only if something essential is missing.