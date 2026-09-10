import { useEffect, useState, type FormEvent } from 'react'
import { createMedia, deleteMedia, fetchEpisodes, fetchMedia, loginAdmin, type CreateMediaInput } from '../utils/api'
import type { MediaItem, MediaType, UserProfile } from '../types'

const TOKEN_KEY = 'streamer.adminToken'

export function AdminPage({
  token: initialToken,
  onLoginSuccess,
}: {
  token?: string
  onLoginSuccess?: (token: string, user: UserProfile) => void
}) {
  const [token, setToken] = useState(() => initialToken || sessionStorage.getItem(TOKEN_KEY) || '')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [form, setForm] = useState<CreateMediaInput>({
    title: '',
    type: 'movie',
    year: undefined,
    genres: [],
    description: '',
    posterUrl: '',
    previewUrl: '',
    subtitleUrl: '',
    subtitleTracks: [],
    imdbId: '',
  })
  const [genreText, setGenreText] = useState('')
  const [subtitleTracksText, setSubtitleTracksText] = useState('')
  const [file, setFile] = useState<File | undefined>()
  const [libraryPath, setLibraryPath] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [seriesOptions, setSeriesOptions] = useState<MediaItem[]>([])
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([])
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0)

  useEffect(() => {
    if (!token) return
    fetchMedia({})
      .then((items) => {
        setLibraryItems(items)
        setSeriesOptions(items.filter((item) => item.type === 'series'))
      })
      .catch(() => {
        setLibraryItems([])
        setSeriesOptions([])
      })
  }, [token, message, libraryRefreshKey])

  const update = <K extends keyof CreateMediaInput>(key: K, value: CreateMediaInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const login = async () => {
    setMessage(null)
    setError(null)
    setLoggingIn(true)
    try {
      const result = await loginAdmin(username.trim(), password)
      setToken(result.token)
      sessionStorage.setItem(TOKEN_KEY, result.token)
      if (onLoginSuccess) onLoginSuccess(result.token, result.user)
      setMessage('Admin login successful.')
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Admin login failed.')
    } finally {
      setLoggingIn(false)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setError(null)
    const title = form.title.trim()
    if (!token.trim()) {
      setError('Log in as the admin user before submitting.')
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
    if (form.type === 'series') {
      /*
       * A series is just a metadata container - the episodes
       * underneath it are what actually have video files. Don't
       * force a poster/file/libraryPath just to create the row.
       */
    } else if (!file && !libraryPath.trim()) {
      setError('Upload a video file or enter an existing library path.')
      return
    }
    if (file && libraryPath.trim()) {
      setError('Choose either an uploaded file or an existing library path, not both.')
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
    if (form.type === 'episode') {
      if (!form.seriesId) {
        setError('Choose which series this episode belongs to.')
        return
      }
      if (!form.season || form.season < 1) {
        setError('Enter a valid season number.')
        return
      }
      if (!form.episodeNumber || form.episodeNumber < 1) {
        setError('Enter a valid episode number.')
        return
      }
    }
    const genres = genreText
      .split(',')
      .map((genre) => genre.trim())
      .filter(Boolean)
    let subtitleTracks: CreateMediaInput['subtitleTracks'] = []
    if (subtitleTracksText.trim()) {
      try {
        const parsed = JSON.parse(subtitleTracksText)
        if (!Array.isArray(parsed)) throw new Error()
        subtitleTracks = parsed
      } catch {
        setError('Subtitle tracks must be a valid JSON array.')
        return
      }
    }
    setSaving(true)
    try {
      await createMedia({ ...form, title, genres, subtitleTracks, file, libraryPath }, token)
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
        subtitleTracks: [],
        imdbId: '',
      })
      setGenreText('')
      setSubtitleTracksText('')
      setFile(undefined)
      setLibraryPath('')
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

        {!token && (
          <div className="mt-6 border border-[#1f3823] bg-[#09130c] p-5">
            <p className="text-xs text-[#b5d7b0]">Admin credentials are configured in the backend .env file.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            </div>
            <button
              type="button"
              onClick={login}
              disabled={loggingIn}
              className="mt-4 bg-[#8dff66] px-5 py-3 text-xs font-bold text-[#07100b] disabled:opacity-40"
            >
              {loggingIn ? 'LOGGING IN…' : 'ADMIN LOGIN'}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs text-red-300" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 text-xs text-[#8dff66]" role="status">
            {message}
          </p>
        )}

        {token && (
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
                <option value="episode">Episode</option>
              </select>
            </label>
            {form.type === 'episode' && (
              <>
                <label className="block text-[10px] text-[#68826b]">
                  SERIES
                  <select
                    value={form.seriesId ?? ''}
                    onChange={(event) => update('seriesId', event.target.value)}
                    className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc]"
                  >
                    <option value="">Select a series…</option>
                    {seriesOptions.map((series) => (
                      <option key={series.id} value={series.id}>
                        {series.title}
                      </option>
                    ))}
                  </select>
                  {seriesOptions.length === 0 && (
                    <span className="mt-2 block text-[10px] text-[#68826b]">
                      No series exist yet - add one with type "TV show" first.
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {field('SEASON', 'season', 'number')}
                  {field('EPISODE #', 'episodeNumber', 'number')}
                </div>
              </>
            )}
            {field('YEAR', 'year', 'number')}
            <label className="block text-[10px] text-[#68826b]">
              IMDB ID {form.type === 'episode' ? '(OPTIONAL - INHERITS FROM SERIES)' : '(OPTIONAL, ENABLES SUBTITLE SEARCH)'}
              <input
                value={form.imdbId ?? ''}
                onChange={(event) => update('imdbId', event.target.value)}
                placeholder="tt0111161"
                className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
              />
              <span className="mt-2 block text-[10px] text-[#68826b]">
                Find it in the title's IMDb URL, e.g. imdb.com/title/<strong>tt0111161</strong>/
              </span>
            </label>
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
              SUBTITLE TRACKS JSON (OPTIONAL)
              <textarea
                value={subtitleTracksText}
                onChange={(event) => setSubtitleTracksText(event.target.value)}
                placeholder={'[{"label":"English","language":"en","url":"https://example.com/en.vtt"}]'}
                rows={3}
                className="mt-2 w-full resize-y border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
              />
            </label>
            <label className="block text-[10px] text-[#68826b] sm:col-span-2">
              MEDIA FILE
              <input
                type="file"
                accept="video/*,audio/*"
                onChange={(event) => setFile(event.target.files?.[0])}
                className="mt-2 block w-full text-xs text-[#b5d7b0] file:mr-3 file:border-0 file:bg-[#8dff66] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#07100b]"
              />
            </label>
            <label className="block text-[10px] text-[#68826b] sm:col-span-2">
              EXISTING LIBRARY FILE (RELATIVE TO MEDIA_ROOTS)
              <input
                value={libraryPath}
                onChange={(event) => setLibraryPath(event.target.value)}
                placeholder="Movies/Example/movie.mp4"
                className="mt-2 w-full border border-[#29442c] bg-[#07100b] px-3 py-3 text-xs text-[#c7f5bc] outline-none focus:border-[#8dff66]"
              />
              <span className="mt-2 block text-[10px] text-[#68826b]">Use this instead of uploading to avoid copying an existing server file.</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#8dff66] px-5 py-3 text-xs font-bold text-[#07100b] disabled:opacity-40 sm:col-span-2"
            >
              {saving ? 'UPLOADING…' : 'CREATE / UPLOAD MEDIA'}
            </button>
          </form>
        )}

        {token && (
          <LibraryManager
            token={token}
            items={libraryItems}
            onChanged={() => setLibraryRefreshKey((key) => key + 1)}
          />
        )}
      </div>
    </section>
  )
}

function LibraryManager({
  token,
  items,
  onChanged,
}: {
  token: string
  items: MediaItem[]
  onChanged: () => void
}) {
  const [expanded, setExpanded] = useState<Record<string, MediaItem[] | 'loading' | undefined>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleSeries = (series: MediaItem) => {
    setExpanded((current) => {
      if (current[series.id] !== undefined) {
        const next = { ...current }
        delete next[series.id]
        return next
      }
      return { ...current, [series.id]: 'loading' }
    })
    if (expanded[series.id] === undefined) {
      fetchEpisodes(series.id)
        .then((episodes) => setExpanded((current) => ({ ...current, [series.id]: episodes })))
        .catch(() => setExpanded((current) => ({ ...current, [series.id]: [] })))
    }
  }

  const handleDelete = async (item: MediaItem, seriesId?: string) => {
    const label = item.type === 'episode'
      ? `episode "${item.title}"`
      : `"${item.title}"${item.type === 'series' ? ' and all of its episodes' : ''}`
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return

    setError(null)
    setDeletingId(item.id)
    try {
      await deleteMedia(item.id, token)
      if (seriesId) {
        setExpanded((current) => {
          const list = current[seriesId]
          if (!Array.isArray(list)) return current
          return { ...current, [seriesId]: list.filter((episode) => episode.id !== item.id) }
        })
      } else {
        onChanged()
      }
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Delete failed.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mt-10 border border-[#1f3823] bg-[#09130c] p-5">
      <h2 className="text-sm font-bold tracking-widest text-[#8dff66]">MANAGE LIBRARY</h2>
      <p className="mt-2 text-xs text-[#68826b]">
        Deleting a movie or episode removes its uploaded file and cached video. Deleting a series
        also removes every episode under it.
      </p>

      {error && (
        <p className="mt-3 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}

      {items.length === 0 && (
        <p className="mt-4 text-xs text-[#68826b]">Nothing in the library yet.</p>
      )}

      <ul className="mt-4 flex flex-col divide-y divide-[#1f3823]">
        {items.map((item) => (
          <li key={item.id} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => item.type === 'series' && toggleSeries(item)}
                disabled={item.type !== 'series'}
                className="min-w-0 flex-1 text-left disabled:cursor-default"
              >
                <span className="block truncate text-sm text-[#c7f5bc]">
                  {item.type === 'series' ? (expanded[item.id] !== undefined ? '▾ ' : '▸ ') : ''}
                  {item.title}
                  {item.year ? ` (${item.year})` : ''}
                </span>
                <span className="mt-0.5 block text-[10px] uppercase tracking-widest text-[#68826b]">
                  {item.type}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                disabled={deletingId === item.id}
                className="shrink-0 border border-[#5a2222] px-3 py-2 text-[10px] font-bold text-red-300 hover:bg-[#2a1414] disabled:opacity-40"
              >
                {deletingId === item.id ? 'DELETING…' : 'DELETE'}
              </button>
            </div>

            {item.type === 'series' && expanded[item.id] === 'loading' && (
              <p className="mt-2 pl-4 text-xs text-[#68826b]">Loading episodes…</p>
            )}

            {item.type === 'series' && Array.isArray(expanded[item.id]) && (
              <ul className="mt-2 flex flex-col gap-1 border-l border-[#1f3823] pl-4">
                {(expanded[item.id] as MediaItem[]).length === 0 && (
                  <li className="text-xs text-[#68826b]">No episodes added yet.</li>
                )}
                {(expanded[item.id] as MediaItem[]).map((episode) => (
                  <li key={episode.id} className="flex items-center justify-between gap-3 py-1">
                    <span className="min-w-0 flex-1 truncate text-xs text-[#b5d7b0]">
                      S{episode.season}E{episode.episodeNumber} · {episode.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(episode, item.id)}
                      disabled={deletingId === episode.id}
                      className="shrink-0 border border-[#5a2222] px-2 py-1 text-[10px] font-bold text-red-300 hover:bg-[#2a1414] disabled:opacity-40"
                    >
                      {deletingId === episode.id ? 'DELETING…' : 'DELETE'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
