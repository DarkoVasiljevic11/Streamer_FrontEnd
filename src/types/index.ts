export type MediaType = 'movie' | 'series'

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
  duration?: string
  episodeLabel?: string
  progress?: number
  badge?: string
  source: 'api' | 'demo'
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
  profileInitials: string
  listsCount: number
  savedCount: number
  onNameChange: (value: string) => void
  onInitialsChange: (value: string) => void
}
