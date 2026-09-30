import { ContinueCard } from '../components/MediaCard'
import { EmptyState } from '../components/EmptyState'
import type { MediaItem } from '../types'

type ContinueWatchingPageProps = {
  items: MediaItem[]
  query: string
  onPlay: (media: MediaItem) => void
}

/*
 * Everything this user has started, movies AND episodes - the full
 * list behind the home page's "Continue watching" row. Items are
 * already resolved to full playable MediaItems by App.tsx (see the
 * continueWatching memo there), so this page just lays them out.
 */
export function ContinueWatchingPage({ items, query, onPlay }: ContinueWatchingPageProps) {
  const filtered = items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))

  return (
    <section className="py-12">
      <div className="mb-8">
        <span className="text-[10px] tracking-widest text-[#8dff66]">RECENTLY WATCHED</span>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#c7f5bc]">Continue watching</h1>
        <p className="mt-3 text-sm text-[#769078]">
          Everything you've started, ready to pick up where you left off.
        </p>
      </div>
      {filtered.length ? (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <ContinueCard key={item.id} media={item} onPlay={onPlay} />
          ))}
        </div>
      ) : (
        <EmptyState
          message={query ? 'Nothing in progress matches your search.' : 'Nothing is currently in progress.'}
        />
      )}
    </section>
  )
}
