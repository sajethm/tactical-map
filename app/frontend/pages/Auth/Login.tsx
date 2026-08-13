import { useForm, Link } from '@inertiajs/react'
import AuthShell, { Field } from '@/components/AuthShell'

export default function Login() {
  const { data, setData, post, processing } = useForm({ email_address: '', password: '' })

  return (
    <AuthShell title="Sign in" subtitle="Command the map from your own account.">
      <form
        onSubmit={(e) => { e.preventDefault(); post('/session') }}
        className="space-y-3.5"
      >
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={data.email_address}
          onChange={(e) => setData('email_address', e.target.value)}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={data.password}
          onChange={(e) => setData('password', e.target.value)}
        />
        <button
          type="submit"
          disabled={processing}
          className="eyebrow h-9 w-full rounded-md border border-edge bg-primary text-foreground transition-colors hover:bg-edge disabled:opacity-50"
        >
          {processing ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-[12.5px] text-dim">
          No account?{' '}
          <Link href="/registration/new" className="text-foreground underline decoration-edge underline-offset-2 hover:decoration-current">
            Register
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
