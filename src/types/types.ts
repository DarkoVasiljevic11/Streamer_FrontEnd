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
  seriesId?: string
  season?: number
  episodeNumber?: number
  imdbId?: string
}

export type UserProfile = {
  id: string
  username: string
  displayName: string
  role: 'user' | 'admin'
  lists: Record<string, string[]>
  continueWatching: Array<{
    mediaId: string
    title: string
    progress: number
    posterUrl?: string
  }>
}

export type MediaCardProps = {
  media: MediaItem
  lists: Record<string, string[]>
  listPicker: string | null
  onListPickerChange: (title: string | null) => void
  onToggleList: (listName: string, title: string) => void
  onCreateList: () => void
  onPlay: (media: MediaItem) => void
}

export type ProfileProps = {
  profileName: string
  username: string
  profileInitials: string
  listsCount: number
  savedCount: number
  onNameChange: (value: string) => void
  onInitialsChange: (value: string) => void
  onSaveAccount: (payload: { username?: string; password?: string; displayName?: string }) => Promise<void> | void
  onLogout: () => void
}
