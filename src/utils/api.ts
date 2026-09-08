import type { MediaItem, MediaType, UserProfile } from '../types'

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
const REQUEST_TIMEOUT_MS = 10_000

export class ApiError extends Error {
 readonly status?: number

 constructor(message: string, status?: number) {
   super(message)
   this.name = 'ApiError'
   this.status = status
 }
}

type RequestOptions = {
  signal?: AbortSignal
  timeoutMs?: number
  token?: string
}

async function requestJson<T>(
  path: string,
  options: RequestOptions = {},
  init: RequestInit = {},
): Promise<T> {
  if (!API_URL)
    throw new ApiError('Media backend is not configured. Set VITE_API_URL to connect it.')
  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? REQUEST_TIMEOUT_MS,
  )
  const abortExternal = () => controller.abort()
  options.signal?.addEventListener('abort', abortExternal, { once: true })
  try {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`)
   if (!(init.body instanceof FormData)) {
     headers.set('Content-Type', 'application/json')
   }
   const response = await fetch(`${API_URL}${path}`, {
     ...init,
     headers,
     signal: controller.signal,
   })
   if (!response.ok) {
     const text = await response.text().catch(() => '')
     throw new ApiError(text || `Media backend returned ${response.status}.`, response.status)
   }
   try {
     return (await response.json()) as T
   } catch {
     throw new ApiError('Media backend returned an invalid response.')
   }
 } catch (error) {
   if (error instanceof ApiError) throw error
   if (error instanceof DOMException && error.name === 'AbortError')
     throw new ApiError('Media backend request timed out.')
   throw new ApiError('Unable to reach the media backend.')
 } finally {
   window.clearTimeout(timeout)
   options.signal?.removeEventListener('abort', abortExternal)
 }
}

type ApiMedia = Omit<MediaItem, 'source' | 'id'> & { id?: string }

function normalizeMedia(item: ApiMedia, index: number): MediaItem {
 const resolveUrl = (value?: string) => {
   if (!value || !API_URL) return value
   try {
     return new URL(value, `${API_URL}/`).toString()
   } catch {
     return value
   }
 }
 return {
   ...item,
   id: item.id ?? `media-${index}`,
   genres: item.genres ?? [],
   source: 'api',
   mediaUrl: resolveUrl(item.fileUrl ?? item.mediaUrl),
   fileUrl: resolveUrl(item.fileUrl ?? item.mediaUrl),
   previewUrl: resolveUrl(item.previewUrl),
   subtitleUrl: resolveUrl(item.subtitleUrl),
   subtitleTracks: item.subtitleTracks?.map((track) => ({ ...track, url: resolveUrl(track.url) ?? track.url })),
   variants: item.variants?.map((variant) => ({ ...variant, url: resolveUrl(variant.url) ?? variant.url })),
 }
}

export async function fetchMedia(
 options: { type?: MediaType; signal?: AbortSignal } = {},
): Promise<MediaItem[]> {
 const query = options.type ? `?type=${encodeURIComponent(options.type)}` : ''
 const result = await requestJson<ApiMedia[] | { items: ApiMedia[] }>(`/api/media${query}`, {
   signal: options.signal,
 })
 const items = Array.isArray(result) ? result : result.items
 return items.map(normalizeMedia)
}

export async function lookupPreviewImage(
 title: string,
 signal?: AbortSignal,
): Promise<{ url: string | null }> {
 return requestJson<{ url: string | null }>(
   `/api/media/preview?title=${encodeURIComponent(title)}`,
   { signal },
 )
}

export async function fetchSubtitleTracks(
  mediaId: string,
  signal?: AbortSignal,
): Promise<Array<{ label: string; language: string; url: string }>> {
  const result = await requestJson<{
    tracks: Array<{ label: string; language: string; url: string }>
  }>(`/api/media/${encodeURIComponent(mediaId)}/subtitles`, { signal })
  return result.tracks
}

export async function checkHealth(signal?: AbortSignal): Promise<{ ok: boolean }> {
 return requestJson<{ ok: boolean }>('/api/health', { signal })
}

export type CreateMediaInput = {
 title: string
 type: MediaType
 year?: number
 genres: string[]
 description: string
 posterUrl: string
 previewUrl: string
 subtitleUrl: string
 subtitleTracks?: Array<{ label: string; language: string; url: string }>
 file?: File
 libraryPath?: string
}

export async function createMedia(
 input: CreateMediaInput,
 token: string,
 signal?: AbortSignal,
): Promise<MediaItem> {
 if (!token.trim()) throw new ApiError('An admin token is required.')
 const formData = new FormData()
 formData.append('title', input.title.trim())
 formData.append('type', input.type)
 if (input.year) formData.append('year', String(input.year))
 formData.append('genres', JSON.stringify(input.genres))
 formData.append('description', input.description.trim())
 formData.append('posterUrl', input.posterUrl.trim())
 formData.append('previewUrl', input.previewUrl.trim())
 formData.append('subtitleUrl', input.subtitleUrl.trim())
 if (input.subtitleTracks?.length) formData.append('subtitleTracks', JSON.stringify(input.subtitleTracks))
 if (input.file) formData.append('file', input.file, input.file.name)
 if (input.libraryPath?.trim()) formData.append('libraryPath', input.libraryPath.trim())
 const result = await requestJson<ApiMedia>(
   '/api/admin/media',
   { token, signal },
   { method: 'POST', body: formData },
 )
 return normalizeMedia(result, 0)
}

export async function loginUser(username: string, password: string): Promise<{ token: string; user: UserProfile }> {
 return requestJson<{ token: string; user: UserProfile }>('/api/auth/login', {}, {
   method: 'POST',
   body: JSON.stringify({ username, password }),
 })
}

export async function registerUser(
 username: string,
 password: string,
 displayName?: string,
): Promise<{ token: string; user: UserProfile }> {
 return requestJson<{ token: string; user: UserProfile }>('/api/auth/register', {}, {
   method: 'POST',
   body: JSON.stringify({ username, password, displayName }),
 })
}

export async function fetchCurrentUser(token: string): Promise<UserProfile> {
 return requestJson<UserProfile>('/api/users/me', { token })
}

export async function saveUserState(
 token: string,
 payload: {
   lists?: Record<string, string[]>
   displayName?: string
   continueWatching?: UserProfile['continueWatching']
 },
): Promise<UserProfile> {
 return requestJson<UserProfile>('/api/users/lists', { token }, {
   method: 'PUT',
   body: JSON.stringify(payload),
 })
}

export async function updateUserAccount(
 token: string,
 payload: {
   username?: string
   password?: string
   displayName?: string
 },
): Promise<UserProfile> {
 return requestJson<UserProfile>('/api/users/account', { token }, {
   method: 'PUT',
   body: JSON.stringify(payload),
 })
}

export async function loginAdmin(username: string, password: string): Promise<{ token: string; user: UserProfile }> {
 return requestJson<{ token: string; user: UserProfile }>('/api/admin/login', {}, {
   method: 'POST',
   body: JSON.stringify({ username, password }),
 })
}
