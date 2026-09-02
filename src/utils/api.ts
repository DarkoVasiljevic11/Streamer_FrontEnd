import type { MediaItem, MediaType } from '../types'

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
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new ApiError(`Media backend returned ${response.status}.`, response.status)
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
  return { ...item, id: item.id ?? `media-${index}`, genres: item.genres ?? [], source: 'api' }
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
  file?: File
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
  if (input.file) formData.append('file', input.file, input.file.name)
  const result = await requestJson<ApiMedia>(
    '/api/admin/media',
    { token, signal },
    { method: 'POST', body: formData },
  )
  return normalizeMedia(result, 0)
}
