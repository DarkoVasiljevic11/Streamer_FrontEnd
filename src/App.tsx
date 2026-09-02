import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { CreateListModal, RenameListModal } from './components/ListModals'
import { MediaPlayerModal } from './components/MediaPlayerModal'
import { DEMO_MEDIA } from './utils/demoData'
import { fetchCurrentUser, fetchMedia, saveUserState, updateUserAccount } from './utils/api'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import { ListsPage } from './pages/ListsPage'
import { LoginPage } from './pages/LoginPage'
import { MoviesPage } from './pages/MoviesPage'
import { ProfilePage } from './pages/ProfilePage'
import { SeriesPage } from './pages/SeriesPage'
import type { MediaItem, UserProfile } from './types'

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
  const [authLoading, setAuthLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [lists, setLists] = useState<Record<string, string[]>>(defaultLists)
  const [listPicker, setListPicker] = useState<string | null>(null)
  const [selected, setSelected] = useState<MediaItem | null>(null)
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
    if (!token) {
      setUser(null)
      setAuthLoading(false)
      return
    }
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

  const continueWatching = useMemo(() => {
    if (user?.continueWatching?.length) {
      return media.flatMap((item) => {
        const watch = user.continueWatching.find((entry) => entry.mediaId === item.id)
        return watch ? [{ ...item, progress: watch.progress }] : []
      })
    }
    return media.filter((item) => item.progress !== undefined)
  }, [media, user])
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
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              media={films}
              continueWatching={continueWatching}
              query={query}
              lists={lists}
              listPicker={listPicker}
              onListPickerChange={setListPicker}
              onToggleList={toggleListItem}
              onCreateList={openCreateList}
              onPlay={setSelected}
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
              onPlay={setSelected}
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
              onPlay={setSelected}
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
              onPlay={setSelected}
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

      {selected && (
        <MediaPlayerModal
          media={selected}
          onClose={() => setSelected(null)}
          onProgress={(progress) => handlePlaybackProgress(selected, progress)}
        />
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
