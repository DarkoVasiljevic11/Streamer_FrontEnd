import { useState, type FormEvent } from 'react'
import { loginUser, registerUser } from '../utils/api'
import type { UserProfile } from '../types'

type LoginPageProps = {
  onLoginSuccess: (token: string, user: UserProfile) => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result =
        mode === 'login'
          ? await loginUser(username.trim(), password)
          : await registerUser(username.trim(), password, displayName.trim())
      onLoginSuccess(result.token, result.user)
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="grid min-h-[70vh] place-items-center px-4 py-12">
      <div className="w-full max-w-md border border-[#1f3823] bg-[#09130c] p-6">
        <span className="text-[10px] tracking-[0.28em] text-[#8dff66]">STREAMER ACCOUNT</span>
        <h1 className="mt-3 text-3xl font-bold text-[#c7f5bc]">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-2 text-sm text-[#769078]">
          Sign in to keep your lists, continue watching progress, and personal library state.
        </p>

        <div className="mt-5 flex gap-2 rounded-sm border border-[#1f3823] p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 px-3 py-2 text-xs ${mode === 'login' ? 'bg-[#8dff66] text-[#07100b]' : 'text-[#b5d7b0]'}`}
          >
            LOGIN
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 px-3 py-2 text-xs ${mode === 'register' ? 'bg-[#8dff66] text-[#07100b]' : 'text-[#b5d7b0]'}`}
          >
            REGISTER
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === 'register' && (
            <label className="block text-[10px] text-[#68826b]">
              DISPLAY NAME
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
              />
            </label>
          )}
          <label className="block text-[10px] text-[#68826b]">
            USERNAME
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
            />
          </label>
          <label className="block text-[10px] text-[#68826b]">
            PASSWORD
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
            />
          </label>
          {error && (
            <p className="text-xs text-red-300" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8dff66] px-5 py-3 text-xs font-bold text-[#07100b] disabled:opacity-40"
          >
            {loading ? 'WORKING…' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>
      </div>
    </section>
  )
}
