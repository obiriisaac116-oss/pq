import { LoginForm } from '@/components/LoginForm'

const ERROR_MESSAGES: Record<string, string> = {
  'auth-required': 'Please sign in to continue to the admin area.',
  'not-admin': 'Your account does not have admin access.',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  const errorCode = searchParams?.error
  const initialError = errorCode ? ERROR_MESSAGES[errorCode] : undefined

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-primary">
            Past Questions Admin
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your admin account.
          </p>
        </div>
        <LoginForm initialError={initialError} />
      </div>
    </main>
  )
}
