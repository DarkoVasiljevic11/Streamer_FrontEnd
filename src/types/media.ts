// Movies, series and episodes as the frontend receives them.

export type MediaType = 'movie' | 'series' | 'episode'

export type MediaVariant = {
  quality: string
  url: string
}

export type SubtitleTrack = {
  label: string
  language: string
  url: string
}

export type MediaItem = {
  id: string
  title: string
  type: MediaType
  year?: number
  genres: string[]
  description?: string
  posterUrl?: string
  previewUrl?: string
  subtitleUrl?: string
  subtitleTracks?: SubtitleTrack[]
  fileUrl?: string
  mediaUrl?: string
  variants?: MediaVariant[]
  duration?: string
  episodeLabel?: string
  progress?: number
  badge?: string
  source: 'api' | 'demo'

  // Episodes only: the parent series and their position within it.
  seriesId?: string
  season?: number
  episodeNumber?: number

  // Used for online subtitle search.
  imdbId?: string
}

// One entry in a user's continue-watching list. progress is a whole-number
// percentage (0-100).
export type ContinueWatchingEntry = {
  mediaId: string
  title: string
  progress: number
  posterUrl?: string
}
