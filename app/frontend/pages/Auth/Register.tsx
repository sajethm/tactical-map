import { useForm, Link } from '@inertiajs/react'
import AuthShell, { Field } from '@/components/AuthShell'

export default function Register() {
  const { data, setData, post, processing } = useForm({ email_address: '', password: '' })

  return (
    <AuthShell title="Create account" subtitle="You need an account to send commands and keep an audit trail.">
      <form
        onSubmit={(e) => { e.preventDefault(); post('/registration') }}
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={data.password}
          onChange={(e) => setData('password', e.target.value)}
        />
        <button
          type="submit"
          disabled={processing}
          className="eyebrow h-9 w-full rounded-md border border-edge bg-primary text-foreground transition-colors hover:bg-edge disabled:opacity-50"
        >
          {processing ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-[12.5px] text-dim">
          Have an account?{' '}
          <Link href="/session/new" className="text-foreground underline decoration-edge underline-offset-2 hover:decoration-current">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
