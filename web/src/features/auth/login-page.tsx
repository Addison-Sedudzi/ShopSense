import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/app/auth-context';

export function LoginPage() {
  const { signIn, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await signIn(email, password);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        <h1 className="text-xl font-semibold text-ink-900">Sign in</h1>

        {error && (
          <p className="mt-3 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-600">{error}</p>
        )}

        <label className="mt-4 block text-sm font-medium text-ink-700">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 block h-touch w-full rounded-md border border-border px-3 text-base text-ink-900 outline-none focus:border-brand-500"
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-ink-700">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 block h-touch w-full rounded-md border border-border px-3 text-base text-ink-900 outline-none focus:border-brand-500"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 h-touch w-full rounded-md bg-brand-600 text-base font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
