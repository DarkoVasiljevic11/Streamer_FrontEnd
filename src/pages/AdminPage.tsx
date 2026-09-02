import { useState, type FormEvent } from 'react'
import { createMedia, type CreateMediaInput } from '../utils/api'
import type { MediaType } from '../types'

const TOKEN_KEY = 'streamer.adminToken'

export function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? '')
  const [form, setForm] = useState<CreateMediaInput>({
    title: '',
    type: 'movie',
    year: undefined,
    genres: [],
    description: '',
    posterUrl: '',
    previewUrl: '',
    subtitleUrl: '',
  })
  const [genreText, setGenreText] = useState('')
  const [file, setFile] = useState<File | undefined>()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const update = <K extends keyof CreateMediaInput>(key: K, value: CreateMediaInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setError(null)
    const title = form.title.trim()
    if (!token.trim()) {
      setError('Enter an admin token before submitting.')
      return
    }
    if (!title) {
      setError('A title is required.')
      return
    }
    if (
      form.year !== undefined &&
      (!Number.isInteger(form.year) || form.year < 1888 || form.year > 2200)
    ) {
      setError('Enter a valid year.')
      return
    }
    if (!form.posterUrl.trim() && !file) {
      setError('Provide a poster URL or select a media file.')
      return
    }
    const urls = [form.posterUrl, form.previewUrl, form.subtitleUrl].filter(Boolean)
    if (
      urls.some((value) => {
        try {
          const url = new URL(value)
          return !['http:', 'https:'].includes(url.protocol)
        } catch {
          return true
        }
      })
    ) {
      setError('Poster, preview, and subtitle URLs must use http or https.')
      return
    }
    if (file && file.type && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      setError('Select a video or audio media file.')
      return
    }
    const genres = genreText
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean)
    setSaving(true)
    try {
      await createMedia({ ...form, title, genres, file }, token)
      sessionStorage.setItem(TOKEN_KEY, token)
      setMessage('Media upload accepted by the backend.')
      setForm({
        title: '',
        type: 'movie',
        year: undefined,
        genres: [],
        description: '',
        posterUrl: '',
        previewUrl: '',
        subtitleUrl: '',
      })
      setGenreText('')
      setFile(undefined)
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Upload failed.')
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, key: keyof CreateMediaInput, type = 'text') => (
    <label className="block text-[10px] text-[#68826b]">
      {label}
      <input
        type={type}
        value={typeof form[key] === 'number' ? form[key] : String(form[key] ?? '')}
        onChange={(event) =>
          update(
            key,
            type === 'number'
              ? event.target.value
                ? Number(event.target.value)
                : undefined
              : (event.target.value as CreateMediaInput[typeof key]),
          )
        }
        className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
      />
    </label>
  )

  return (
    <section className="py-12">
      <div className="max-w-3xl">
        <span className="text-[10px] tracking-widest text-[#8dff66]">LIBRARY ADMIN</span>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#c7f5bc]">Add media</h1>
        <p className="mt-3 text-sm leading-6 text-[#769078]">
          Upload a movie or TV show to the configured media API.
        </p>
        <div className="mt-6 border border-yellow-900 bg-[#171508] p-4 text-xs text-yellow-100">
          This is only a frontend access gate. Authorization and file validation must be enforced
          server-side. The token is stored in sessionStorage and sent as a Bearer token.
        </div>
        <form
          onSubmit={submit}
          className="mt-6 grid gap-4 border border-[#1f3823] bg-[#09130c] p-5 sm:grid-cols-2"
        >
          <label className="block text-[10px] text-[#68826b] sm:col-span-2">
            ADMIN TOKEN
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              onBlur={() => {
                if (token.trim()) sessionStorage.setItem(TOKEN_KEY, token)
                else sessionStorage.removeItem(TOKEN_KEY)
              }}
              autoComplete="off"
              className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
            />
          </label>
          {field('TITLE', 'title')}
          <label className="block text-[10px] text-[#68826b]">
            TYPE
            <select
              value={form.type}
              onChange={(event) => update('type', event.target.value as MediaType)}
              className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc]"
            >
              <option value="movie">Movie</option>
              <option value="series">TV show</option>
            </select>
          </label>
          {field('YEAR', 'year', 'number')}
          <label className="block text-[10px] text-[#68826b]">
            GENRES (COMMA SEPARATED)
            <input
              value={genreText}
              onChange={(event) => setGenreText(event.target.value)}
              placeholder="Sci-fi, Drama"
              className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
            />
          </label>
          <label className="block text-[10px] text-[#68826b] sm:col-span-2">
            DESCRIPTION
            <textarea
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              rows={4}
              className="mt-2 w-full resize-y border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
            />
          </label>
          {field('POSTER URL', 'posterUrl', 'url')}
          {field('PREVIEW IMAGE URL', 'previewUrl', 'url')}
          {field('SUBTITLE URL', 'subtitleUrl', 'url')}
          <label className="block text-[10px] text-[#68826b] sm:col-span-2">
            MEDIA FILE
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={(event) => setFile(event.target.files?.[0])}
              className="mt-2 block w-full text-xs text-[#b5d7b0] file:mr-3 file:border-0 file:bg-[#8dff66] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#07100b]"
            />
          </label>
          {error && (
            <p className="sm:col-span-2 text-xs text-red-300" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="sm:col-span-2 text-xs text-[#8dff66]" role="status">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={saving}
            className="bg-[#8dff66] px-5 py-3 text-xs font-bold text-[#07100b] disabled:opacity-40 sm:col-span-2"
          >
            {saving ? 'UPLOADING…' : 'CREATE / UPLOAD MEDIA'}
          </button>
        </form>
      </div>
    </section>
  )
}
