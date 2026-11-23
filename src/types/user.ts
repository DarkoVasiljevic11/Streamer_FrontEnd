import type { ContinueWatchingEntry } from './media'

export type UserRole = 'user' | 'admin'

// Named playlists: list name -> ids (or titles) of the items in it.
export type ListsMap = Record<string, string[]>

export type UserProfile = {
  id: string
  username: string
  displayName: string
  role: UserRole
  lists: ListsMap
  continueWatching: ContinueWatchingEntry[]
}
