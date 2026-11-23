import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { CreateListModal, RenameListModal } from './components/ListModals'
import { SeriesEpisodesModal } from './components/SeriesEpisodesModal'
import { DEMO_MEDIA } from './utils/demoData'
import { fetchCurrentUser, fetchMedia, fetchMediaById, saveUserState, updateUserAccount } from './utils/api'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MoviesPage } from './pages/MoviesPage'
import { SeriesPage } from './pages/SeriesPage'
import type { MediaItem, UserProfile } from './types'

/*
Code-split anything that isn't needed for the first paint of the
most common journey (browsing movies/series and logging in).

MediaPlayerModal alone pulls in hls.js - a substantial dependency
that only ever matters once someone actually presses play - so
bundling it into the main chunk would make every single visitor
download player code whether or not they ever watch anything.
AdminPage/ProfilePage/ListsPage are large-ish and only reached by
a fraction of visits, so they're worth splitting too even without
a heavy dependency of their own.

HomePage/MoviesPage/SeriesPage/LoginPage stay as regular imports:
they're small and are exactly what most visits need immediately,
so lazy-loading them would trade a real bundle-size win for a
network round-trip most people would hit anyway.
*/
const MediaPlayerModal = lazy(() => import('./components/MediaPlayerModal'))
const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })),
)
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })),
)
const ListsPage = lazy(() =>
  import('./pages/ListsPage').then((module) => ({ default: module.ListsPage })),
)
const ContinueWatchingPage = lazy(() =>
  import('./pages/ContinueWatchingPage').then((module) => ({
    default: module.ContinueWatchingPage,
  })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1f3823] border-t-[#8dff66]" />
    </div>
  )
}


const defaultLists = {
  'Watch later': ['Past Lives'],
  'Weekend picks': [],
}

const normalizeLists = (value: Record<string, string[]> | null | undefined): Record<string, string[]> => {
  if (!value) return defaultLists
  return Object.fromEntries(
    Object.entries(value).map(([name, items]) => [
      name,
      Array.isArray(items)
        ? items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [],
    ]),
  )
}

function App() {
  const location = useLocation()
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('streamer.jwt'))
  const [user, setUser] = useState<UserProfile | null>(null)
  const [media, setMedia] = useState<MediaItem[]>(DEMO_MEDIA)
  const [loading, setLoading] = useState(true)
  // Only a stored token needs a network check. Without one, there is nothing
  // to load, so the flag starts false and no effect has to clear it.
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem('streamer.jwt')))
  const [apiError, setApiError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [lists, setLists] = useState<Record<string, string[]>>(defaultLists)
  const [listPicker, setListPicker] = useState<string | null>(null)
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<MediaItem | null>(null)

  /*
   * Series don't have a video of their own - clicking one should
   * open the episode picker instead of trying to play it directly.
   * Movies (and episodes selected from that picker) play as before.
   */
  const handleMediaSelect = (item: MediaItem) => {
    if (item.type === 'series') {
      setSelectedSeries(item)
      return
    }
    setSelected(item)
  }
  const [createListModal, setCreateListModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [editingList, setEditingList] = useState<string | null>(null)
  const [editedListName, setEditedListName] = useState('')
  const [profileName, setProfileName] = useState('Djare')
  const [profileInitials, setProfileInitials] = useState('DJ')
  const [query, setQuery] = useState('')
  const openCreateList = () => {
    setListPicker(null)
    setCreateListModal(true)
  }
  const searchSuggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []
    return media
      .map((item) => item.title)
      .filter((title, index, titles) => titles.indexOf(title) === index)
      .filter((title) => title.toLowerCase().includes(normalized))
      .slice(0, 8)
  }, [media, query])

  const persistUserState = async (
    nextLists: Record<string, string[]>,
    nextDisplayName = profileName,
    nextContinueWatching = user?.continueWatching ?? [],
  ) => {
    if (!token) return
    try {
      const updated = await saveUserState(token, {
        lists: nextLists,
        displayName: nextDisplayName,
        continueWatching: nextContinueWatching,
      })
      setUser(updated)
      setLists(normalizeLists(updated.lists ?? nextLists))
    } catch {
      // silently ignore if no backend sync is available
    }
  }

  useEffect(() => {
    // Logged out (or never logged in): nothing to fetch. The user is already
    // null in this case - logout and the failed-token path both clear it.
    if (!token) return
    let active = true
    fetchCurrentUser(token)
      .then((profile) => {
        if (!active) return
        setUser(profile)
        setProfileName(profile.displayName || profile.username)
        setProfileInitials((profile.displayName || profile.username).trim().slice(0, 2).toUpperCase() || '??')
        setLists(normalizeLists(profile.lists))
      })
      .catch(() => {
        localStorage.removeItem('streamer.jwt')
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        if (active) setAuthLoading(false)
      })
    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    if (!token || !user) return
    let active = true
    fetchMedia()
      .then((items) => {
        if (!active) return
        setMedia(items)
        setIsDemo(false)
        setApiError(null)
      })
      .catch((error: unknown) => {
        if (!active) return
        const message = error instanceof Error ? error.message : 'The media service is unavailable.'
        setApiError(message)
        setIsDemo(!import.meta.env.VITE_API_URL)
        setMedia(import.meta.env.VITE_API_URL ? [] : DEMO_MEDIA)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [token, user])

  useEffect(() => {
    const closePicker = () => setListPicker(null)
    document.addEventListener('pointerdown', closePicker)
    return () => document.removeEventListener('pointerdown', closePicker)
  }, [])

  /*
   * Continue watching.
   *
   * IMPORTANT: this used to cross-reference user.continueWatching
   * against `media`, which deliberately excludes episodes (see
   * handleMediaList on the backend - episodes only ever load
   * per-series, not in the unscoped library list). That meant any
   * continue-watching entry for an EPISODE could never resolve to
   * a playable item - it would just silently vanish from the row,
   * or fail to actually resume. Fetching each entry's full item by
   * ID directly (movie, series, or episode - fetchMediaById works
   * for all three) fixes that.
   *
   * Cached per-ID and only re-fetched when the SET of ids changes
   * (via idsKey below), not on every progress update - playback
   * reports progress every few seconds while watching, and
   * user.continueWatching gets a new array identity each time,
   * which would otherwise refire this constantly.
   */
  const [continueWatchingCache, setContinueWatchingCache] = useState<Record<string, MediaItem>>({})
  const fetchedContinueWatchingIds = useRef<Set<string>>(new Set())

  const continueWatchingIdsKey = (user?.continueWatching ?? [])
    .map((entry) => entry.mediaId)
    .join(',')

  useEffect(() => {
    const ids = continueWatchingIdsKey ? continueWatchingIdsKey.split(',') : []
    const missing = ids.filter((id) => !fetchedContinueWatchingIds.current.has(id))
    if (missing.length === 0) return

    missing.forEach((id) => fetchedContinueWatchingIds.current.add(id))

    let cancelled = false
    void Promise.allSettled(missing.map((id) => fetchMediaById(id))).then((results) => {
      if (cancelled) return
      setContinueWatchingCache((current) => {
        const next = { ...current }
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            next[missing[index]] = result.value
          } else {
            // Don't retry a genuinely missing/deleted item forever.
            fetchedContinueWatchingIds.current.add(missing[index])
          }
        })
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [continueWatchingIdsKey])

  const continueWatching = useMemo(() => {
    if (user?.continueWatching?.length) {
      return user.continueWatching.flatMap((watch) => {
        const item = continueWatchingCache[watch.mediaId]
        return item ? [{ ...item, progress: watch.progress }] : []
      })
    }
    return media.filter((item) => item.progress !== undefined)
  }, [user, continueWatchingCache, media])
  const films = useMemo(() => media.filter((item) => item.type === 'movie'), [media])
  const series = useMemo(() => media.filter((item) => item.type === 'series'), [media])
  const mediaByTitle = useMemo(() => new Map(media.map((item) => [item.title, item])), [media])

  const toggleListItem = (listName: string, title: string) => {
    const next = { ...lists }
    const items = next[listName] ?? []
    next[listName] = items.includes(title)
      ? items.filter((item) => item !== title)
      : [...items, title]
    setLists(next)
    void persistUserState(next)
  }

  const createList = () => {
    const name = newListName.trim()
    if (!name || lists[name]) return
    const next = { ...lists, [name]: [] }
    setLists(next)
    setNewListName('')
    setCreateListModal(false)
    void persistUserState(next)
  }

  const renameList = () => {
    const name = editedListName.trim()
    if (!editingList || !name || (name !== editingList && lists[name])) return
    const next = { ...lists }
    next[name] = next[editingList] ?? []
    if (name !== editingList) delete next[editingList]
    setLists(next)
    setEditingList(null)
    void persistUserState(next)
  }

  const removeList = (listName: string) => {
    const next = { ...lists }
    delete next[listName]
    setLists(next)
    void persistUserState(next)
  }

  const handleLoginSuccess = (jwtToken: string, profile: UserProfile) => {
    localStorage.setItem('streamer.jwt', jwtToken)
    setToken(jwtToken)
    setUser(profile)
    setProfileName(profile.displayName || profile.username)
    setProfileInitials((profile.displayName || profile.username).trim().slice(0, 2).toUpperCase() || '??')
    setLists(normalizeLists(profile.lists))
  }

  const handleLogout = () => {
    localStorage.removeItem('streamer.jwt')
    setToken(null)
    setUser(null)
    setProfileName('Djare')
    setProfileInitials('DJ')
    setLists(defaultLists)
  }

  const handleAccountSave = async (payload: { username?: string; password?: string; displayName?: string }) => {
    if (!token) return
    const updated = await updateUserAccount(token, payload)
    setUser(updated)
    setProfileName(updated.displayName || updated.username)
    setProfileInitials((updated.displayName || updated.username).trim().slice(0, 2).toUpperCase() || '??')
    setLists(normalizeLists(updated.lists ?? lists))
  }

  const handlePlaybackProgress = (item: MediaItem, progress: number) => {
    if (!token || !user) return
    const existing = user.continueWatching ?? []
    const next = [
      ...existing.filter((entry) => entry.mediaId !== item.id),
      { mediaId: item.id, title: item.title, progress, posterUrl: item.posterUrl },
    ].sort((a, b) => b.progress - a.progress)
    setUser((current) => (current ? { ...current, continueWatching: next } : current))
    void saveUserState(token, { continueWatching: next })
      .then((updated) => setUser(updated))
      .catch((error: unknown) => {
        setApiError(error instanceof Error ? error.message : 'Unable to save playback progress.')
      })
  }

  if (!token || !user) {
    if (location.pathname === '/admin') {
      return <AdminPage onLoginSuccess={handleLoginSuccess} />
    }
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <AppShell
      profileName={profileName}
      profileInitials={profileInitials}
      savedCount={Object.values(lists).flat().length}
      isDemo={isDemo}
      apiError={apiError}
      loading={loading || authLoading}
      query={query}
      onQueryChange={setQuery}
      searchSuggestions={searchSuggestions}
      onSearchSelect={setQuery}
    >
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                media={media}
                continueWatching={continueWatching}
                query={query}
                lists={lists}
                listPicker={listPicker}
                onListPickerChange={setListPicker}
                onToggleList={toggleListItem}
                onCreateList={openCreateList}
                onPlay={handleMediaSelect}
              />
            }
          />
          <Route
            path="/movies"
            element={
              <MoviesPage
                media={films}
                query={query}
                lists={lists}
                listPicker={listPicker}
                onListPickerChange={setListPicker}
                onToggleList={toggleListItem}
                onCreateList={openCreateList}
                onPlay={handleMediaSelect}
              />
            }
          />
          <Route
            path="/series"
            element={
              <SeriesPage
                media={series}
                query={query}
                lists={lists}
                listPicker={listPicker}
                onListPickerChange={setListPicker}
                onToggleList={toggleListItem}
                onCreateList={openCreateList}
                onPlay={handleMediaSelect}
              />
            }
          />
          <Route
            path="/continue"
            element={
              <ContinueWatchingPage
                items={continueWatching}
                query={query}
                onPlay={handleMediaSelect}
              />
            }
          />
          <Route
            path="/list/*"
            element={
              <ListsPage
                lists={lists}
                mediaByTitle={mediaByTitle}
                query={query}
                onPlay={handleMediaSelect}
                onToggleList={toggleListItem}
                onCreateList={openCreateList}
                onRename={(name) => {
                  setEditingList(name)
                  setEditedListName(name)
                }}
                onRemove={removeList}
              />
            }
          />
          <Route
            path="/profile"
            element={
              <ProfilePage
                profileName={profileName}
                username={user.username}
                profileInitials={profileInitials}
                listsCount={Object.keys(lists).length}
                savedCount={Object.values(lists).flat().length}
                onNameChange={(value) => {
                  const nextName = value
                  setProfileName(nextName)
                  setProfileInitials(nextName.trim().slice(0, 2).toUpperCase() || '??')
                  void persistUserState(lists, nextName)
                }}
                onInitialsChange={(value) => setProfileInitials(value)}
                onSaveAccount={handleAccountSave}
                onLogout={handleLogout}
              />
            }
          />
          <Route
            path="/admin"
            element={
              user.role === 'admin' ? (
                <AdminPage token={token} onLoginSuccess={handleLoginSuccess} />
              ) : (
                <section className="py-12">
                  <div className="max-w-xl border border-[#1f3823] bg-[#09130c] p-6">
                    <span className="text-[10px] tracking-[0.2em] text-[#8dff66]">SECURE ADMIN</span>
                    <h2 className="mt-3 text-3xl font-bold text-[#c7f5bc]">Access denied</h2>
                    <p className="mt-3 text-sm text-[#769078]">
                      This area is restricted to the admin account configured in the backend.
                    </p>
                  </div>
                </section>
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {selectedSeries && (
        <SeriesEpisodesModal
          key={selectedSeries.id}
          series={selectedSeries}
          onClose={() => setSelectedSeries(null)}
          onPlayEpisode={(episode) => {
            setSelectedSeries(null)
            setSelected(episode)
          }}
        />
      )}
      {selected && (
        <Suspense fallback={null}>
          <MediaPlayerModal
            media={selected}
            onClose={() => setSelected(null)}
            onProgress={(progress) => handlePlaybackProgress(selected, progress)}
          />
        </Suspense>
      )}
      {createListModal && (
        <CreateListModal
          name={newListName}
          lists={lists}
          onChange={setNewListName}
          onClose={() => setCreateListModal(false)}
          onCreate={createList}
        />
      )}
      {editingList && (
        <RenameListModal
          name={editedListName}
          lists={lists}
          originalName={editingList}
          onChange={setEditedListName}
          onClose={() => setEditingList(null)}
          onRename={renameList}
        />
      )}
    </AppShell>
  )
}

export default App
