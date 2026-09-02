import { MediaCard } from '../components/MediaCard'
import { EmptyState } from '../components/EmptyState'
import type { MediaItem } from '../types'

type SeriesPageProps = {
  media: MediaItem[]
  query: string
  lists: Record<string, string[]>
  listPicker: string | null
  onListPickerChange: (title: string | null) => void
  onToggleList: (listName: string, title: string) => void
  onCreateList: () => void
  onPlay: (media: MediaItem) => void
}

export function SeriesPage({
  media,
  query,
  lists,
  listPicker,
  onListPickerChange,
  onToggleList,
  onCreateList,
  onPlay,
}: SeriesPageProps) {
  const filtered = media.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <section className="py-12">
      <div className="mb-8">
        <span className="text-[10px] tracking-widest text-[#8dff66]">LOCAL SERIES</span>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#c7f5bc]">Series</h1>
        <p className="mt-3 text-sm text-[#769078]">Pick up an episode from your library.</p>
      </div>
      {filtered.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              media={item}
              lists={lists}
              listPicker={listPicker}
              onListPickerChange={onListPickerChange}
              onToggleList={onToggleList}
              onCreateList={onCreateList}
              onPlay={onPlay}
            />
          ))}
        </div>
      ) : (
        <EmptyState message={query ? 'No series match your search.' : 'No series are available from the backend yet.'} />
      )}
    </section>
  )
}
