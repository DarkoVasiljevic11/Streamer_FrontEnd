import { useEffect, useState } from 'react'
import type { ProfileProps } from '../types'

export function ProfilePage({
  profileName,
  username,
  profileInitials,
  listsCount,
  savedCount,
  onNameChange,
  onInitialsChange,
  onSaveAccount,
  onLogout,
}: ProfileProps) {
  const [displayName, setDisplayName] = useState(profileName)
  const [accountUsername, setAccountUsername] = useState(username)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDisplayName(profileName)
    setAccountUsername(username)
  }, [profileName, username])

  const save = async () => {
    setError(null)
    setStatus(null)
    setSaving(true)
    try {
      await onSaveAccount({
        username: accountUsername.trim(),
        password: password.trim() || undefined,
        displayName: displayName.trim(),
      })
      onNameChange(displayName.trim())
      onInitialsChange(displayName.trim().slice(0, 2).toUpperCase() || '??')
      setPassword('')
      setStatus('Account updated.')
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update account.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="py-12">
      <div className="max-w-2xl">
        <span className="text-[10px] tracking-widest text-[#8dff66]">ACCOUNT</span>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#c7f5bc]">{displayName || profileName}</h1>
        <p className="mt-3 text-sm leading-6 text-[#769078]">
          Update your profile, username, password, and session state.
        </p>

        <div className="mt-8 border border-[#1f3823] bg-[#09130c] p-5">
          <h2 className="text-sm text-[#c7f5bc]">Profile details</h2>
          <label className="mt-5 block text-[10px] text-[#68826b]">
            DISPLAY NAME
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
            />
          </label>
          <label className="mt-4 block text-[10px] text-[#68826b]">
            USERNAME
            <input
              value={accountUsername}
              onChange={(event) => setAccountUsername(event.target.value)}
              className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
            />
          </label>
          <label className="mt-4 block text-[10px] text-[#68826b]">
            NEW PASSWORD
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leave blank to keep current password"
              className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
            />
          </label>
          <label className="mt-4 block text-[10px] text-[#68826b]">
            INITIALS
            <input
              value={profileInitials}
              maxLength={2}
              onChange={(event) => onInitialsChange(event.target.value.toUpperCase().slice(0, 2))}
              className="mt-2 w-24 border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs uppercase text-[#c7f5bc] outline-none focus:border-[#8dff66]"
            />
          </label>

          {error && <p className="mt-4 text-xs text-red-300">{error}</p>}
          {status && <p className="mt-4 text-xs text-[#8dff66]">{status}</p>}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="bg-[#8dff66] px-5 py-3 text-xs font-bold text-[#07100b] disabled:opacity-40"
            >
              {saving ? 'SAVING…' : 'SAVE CHANGES'}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="border border-[#29442c] bg-[#07100b] px-5 py-3 text-xs font-bold text-[#c7f5bc]"
            >
              LOG OUT
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="border border-[#1f3823] bg-[#09130c] p-5">
            <span className="text-[10px] text-[#58705b]">LISTS</span>
            <strong className="mt-2 block text-2xl text-[#8dff66]">{listsCount}</strong>
          </div>
          <div className="border border-[#1f3823] bg-[#09130c] p-5">
            <span className="text-[10px] text-[#58705b]">SAVED TITLES</span>
            <strong className="mt-2 block text-2xl text-[#8dff66]">{savedCount}</strong>
          </div>
        </div>
      </div>
    </section>
  )
}
