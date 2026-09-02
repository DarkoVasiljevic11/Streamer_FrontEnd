import { ChevronDown, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ContinueCard, MediaCard } from '../components/MediaCard'
import { EmptyState } from '../components/EmptyState'
import type { MediaItem } from '../types'

type HomePageProps = {
  media: MediaItem[]
  continueWatching: MediaItem[]
  query: string
  lists: Record<string, string[]>
  listPicker: string | null
  onListPickerChange: (title: string | null) => void
  onToggleList: (listName: string, title: string) => void
  onCreateList: () => void
  onPlay: (media: MediaItem) => void
}

export function HomePage({
  media,
  continueWatching,
  query,
  lists,
  listPicker,
  onListPickerChange,
  onToggleList,
  onCreateList,
  onPlay,
}: HomePageProps) {
  const filtered = media.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
  const hero = media.find((item) => item.title === 'Dune: Part Two') ?? media[0]
  return (
    <div>
      {hero && (
        <section className="relative min-h-[390px] overflow-hidden border-b border-[#1f3823] py-14">
          <div className="relative z-10 max-w-xl">
            <span className="text-[10px] tracking-[0.2em] text-[#8dff66]">— LIBRARY SPOTLIGHT</span>
            <h1 className="mt-5 text-5xl font-bold leading-[0.98] tracking-[-0.09em] text-[#d8e6d7] md:text-6xl">
              {hero.title.includes(':') ? (
                <>
                  {hero.title.split(':')[0]}:{' '}
                  <em className="not-italic text-[#8dff66]">
                    {hero.title.split(':').slice(1).join(':')}
                  </em>
                </>
              ) : (
                hero.title
              )}
            </h1>
            <p className="mt-5 text-sm leading-7 text-[#769078]">
              Your local collection, shared with the people
              <br className="hidden md:block" /> you watch with.
            </p>
            <div className="relative mt-7 flex gap-3">
              <button
                onClick={() => onPlay(hero)}
                className="flex items-center gap-2 bg-[#8dff66] px-5 py-3 text-xs font-bold text-[#07100b] hover:bg-[#baffaa]"
              >
                <Play size={15} fill="currentColor" /> PLAY
              </button>
            </div>
            <div className="mt-7 flex gap-5 text-[10px] text-[#769078]">
              <span className="text-[#8dff66]">{hero.badge ?? 'UHD'}</span>
              <span>{hero.year ?? '—'}</span>
              <span>{hero.duration ?? 'Feature'}</span>
              <span>{hero.genres.join(' / ')}</span>
            </div>
          </div>
        </section>
      )}
      <section className="py-9">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <span className="text-[10px] tracking-widest text-[#58705b]">RECENTLY WATCHED</span>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-[#c7f5bc]">
              Continue watching
            </h2>
          </div>
          <Link to="/movies" className="text-xs text-[#769078] hover:text-[#8dff66]">
            VIEW ALL →
          </Link>
        </div>
        {continueWatching.length ? (
          <div className="grid gap-5 md:grid-cols-3">
            {continueWatching.map((item) => (
              <ContinueCard key={item.id} media={item} onPlay={onPlay} />
            ))}
          </div>
        ) : (
          <EmptyState message="Nothing is currently in progress." />
        )}
      </section>
      <section className="pb-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <span className="text-[10px] tracking-widest text-[#58705b]">IN THE LIBRARY</span>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-[#c7f5bc]">
              Browse collection
            </h2>
          </div>
          <button className="flex items-center gap-2 border border-[#1f3823] px-3 py-2 text-[10px] text-[#769078] hover:border-[#8dff66] hover:text-[#baffaa]">
            ALL GENRES
            <ChevronDown size={13} />
          </button>
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
          <EmptyState
            message={
              query ? 'No titles match your search.' : 'No media is available from the backend yet.'
            }
          />
        )}
      </section>
      <footer className="flex justify-between border-t border-[#1f3823] py-6 text-[9px] tracking-wide text-[#526b56]">
        <span>streamer / private media server</span>
        <span>shared with friends</span>
      </footer>
    </div>
  )
}
