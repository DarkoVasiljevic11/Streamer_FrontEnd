// Shapes sent to and received from the backend's admin and lookup endpoints.
import type { MediaType } from './media'

export type SubtitleSearchResult = {
  label: string
  language: string
  url: string
}

export type CreateMediaInput = {
 title: string
 type: MediaType
 year?: number
 genres: string[]
 description: string
 posterUrl: string
 subtitleUrl: string
 subtitleTracks?: Array<{ label: string; language: string; url: string }>
 file?: File
 libraryPath?: string
 imdbId?: string
 seriesId?: string
 season?: number
 episodeNumber?: number
}

export type MetadataLookupResult = {
  title?: string
  year?: number
  description?: string
  posterUrl?: string
  imdbId?: string
  message?: string
}
