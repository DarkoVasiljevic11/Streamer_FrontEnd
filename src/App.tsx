import { useEffect, useMemo, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { CreateListModal, RenameListModal } from './components/ListModals'
import { MediaPlayerModal } from './components/MediaPlayerModal'
import { DEMO_MEDIA } from './utils/demoData'
import { fetchMedia } from './utils/api'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import { ListsPage } from './pages/ListsPage'
import { MoviesPage } from './pages/MoviesPage'
import { ProfilePage } from './pages/ProfilePage'
import { SeriesPage } from './pages/SeriesPage'
import type { MediaItem } from './types'

function App() {
  const [media, setMedia] = useState<MediaItem[]>(DEMO_MEDIA)
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [lists, setLists] = useState<Record<string, string[]>>({ 'Watch later': ['Past Lives'], 'Weekend picks': [] })
  const [listPicker, setListPicker] = useState<string | null>(null)
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [createListModal, setCreateListModal] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [editingList, setEditingList] = useState<string | null>(null)
  const [editedListName, setEditedListName] = useState('')
  const [profileName, setProfileName] = useState('Djare')
  const [profileInitials, setProfileInitials] = useState('DJ')
  const [query, setQuery] = useState('')

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    const closePicker = () => setListPicker(null)
    document.addEventListener('pointerdown', closePicker)
    return () => document.removeEventListener('pointerdown', closePicker)
  }, [])

  const continueWatching = useMemo(() => media.filter((item) => item.progress !== undefined), [media])
  const films = useMemo(() => media.filter((item) => item.type === 'movie'), [media])
  const series = useMemo(() => media.filter((item) => item.type === 'series'), [media])
  const mediaByTitle = useMemo(() => new Map(media.map((item) => [item.title, item])), [media])

  const toggleListItem = (listName: string, title: string) => setLists((current) => {
    const items = current[listName] ?? []
    return { ...current, [listName]: items.includes(title) ? items.filter((item) => item !== title) : [...items, title] }
  })

  const createList = () => {
    const name = newListName.trim()
    if (!name || lists[name]) return
    setLists((current) => ({ ...current, [name]: [] }))
    setNewListName('')
    setCreateListModal(false)
  }

  const renameList = () => {
    const name = editedListName.trim()
    if (!editingList || !name || (name !== editingList && lists[name])) return
    setLists((current) => {
      const next = { ...current, [name]: current[editingList] ?? [] }
      if (name !== editingList) delete next[editingList]
      return next
    })
    setEditingList(null)
  }

  const removeList = (listName: string) => setLists((current) => {
    const next = { ...current }
    delete next[listName]
    return next
  })

  return (
    <AppShell
      profileName={profileName}
      profileInitials={profileInitials}
      savedCount={Object.values(lists).flat().length}
      isDemo={isDemo}
      apiError={apiError}
      loading={loading}
      query={query}
      onQueryChange={setQuery}
    >
      <Routes>
        <Route path="/" element={<HomePage media={films} continueWatching={continueWatching} query={query} lists={lists} listPicker={listPicker} onListPickerChange={setListPicker} onToggleList={toggleListItem} onCreateList={() => setCreateListModal(true)} onPlay={setSelected} />} />
        <Route path="/movies" element={<MoviesPage media={films} query={query} lists={lists} listPicker={listPicker} onListPickerChange={setListPicker} onToggleList={toggleListItem} onCreateList={() => setCreateListModal(true)} onPlay={setSelected} />} />
        <Route path="/series" element={<SeriesPage media={series} lists={lists} listPicker={listPicker} onListPickerChange={setListPicker} onToggleList={toggleListItem} onCreateList={() => setCreateListModal(true)} onPlay={setSelected} />} />
        <Route path="/list" element={<ListsPage lists={lists} mediaByTitle={mediaByTitle} onPlay={setSelected} onToggleList={toggleListItem} onCreateList={() => setCreateListModal(true)} onRename={(name) => { setEditingList(name); setEditedListName(name) }} onRemove={removeList} />} />
        <Route path="/profile" element={<ProfilePage profileName={profileName} profileInitials={profileInitials} listsCount={Object.keys(lists).length} savedCount={Object.values(lists).flat().length} onNameChange={(value) => { setProfileName(value); setProfileInitials(value.trim().slice(0, 2).toUpperCase() || '??') }} onInitialsChange={setProfileInitials} />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>

      {selected && <MediaPlayerModal media={selected} onClose={() => setSelected(null)} />}
      {createListModal && <CreateListModal name={newListName} lists={lists} onChange={setNewListName} onClose={() => setCreateListModal(false)} onCreate={createList} />}
      {editingList && <RenameListModal name={editedListName} lists={lists} originalName={editingList} onChange={setEditedListName} onClose={() => setEditingList(null)} onRename={renameList} />}
    </AppShell>
  )
}

export default App
