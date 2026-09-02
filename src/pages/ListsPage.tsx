import { Play } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import type { MediaItem } from '../types'

type ListsPageProps = {
  lists: Record<string, string[]>
  mediaByTitle: Map<string, MediaItem>
  query: string
  onPlay: (media: MediaItem) => void
  onToggleList: (listName: string, title: string) => void
  onCreateList: () => void
  onRename: (name: string) => void
  onRemove: (name: string) => void
}

export function ListsPage({
  lists,
  mediaByTitle,
  query,
  onPlay,
  onToggleList,
  onCreateList,
  onRename,
  onRemove,
}: ListsPageProps) {
  return (
    <section className="py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="text-[10px] tracking-widest text-[#8dff66]">YOUR COLLECTIONS</span>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#c7f5bc]">My lists</h1>
        </div>
        <button
          onClick={onCreateList}
          className="bg-[#8dff66] px-4 py-3 text-xs font-bold text-[#07100b]"
        >
          + NEW LIST
        </button>
      </div>
      {Object.keys(lists).length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {Object.entries(lists).map(([listName, titles]) => {
            const visibleTitles = titles.filter((title) => title.toLowerCase().includes(query.toLowerCase()))
            return (
            <div key={listName} className="border border-[#1f3823] bg-[#09130c] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg text-[#c7f5bc]">{listName}</h2>
                  <span className="text-xs text-[#8dff66]">{titles.length} TITLES</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onRename(listName)}
                    className="text-[10px] text-[#769078] hover:text-[#8dff66]"
                  >
                    RENAME
                  </button>
                  <button
                    onClick={() => onRemove(listName)}
                    className="text-[10px] text-[#769078] hover:text-red-400"
                  >
                    REMOVE
                  </button>
                </div>
              </div>
              {visibleTitles.length ? (
                <div className="mt-5 grid gap-3">
                  {visibleTitles.map((title) => (
                    <div
                      key={title}
                      className="flex items-center justify-between border-t border-[#1f3823] pt-3 text-xs text-[#b5d7b0]"
                    >
                      {mediaByTitle.has(title) ? (
                        <button
                          onClick={() => onPlay(mediaByTitle.get(title)!)}
                          className="flex items-center gap-2 text-left hover:text-[#8dff66]"
                        >
                          <Play size={13} />
                          {title}
                        </button>
                      ) : (
                        <span>
                          {title} <small className="text-[#68826b]">(unavailable)</small>
                        </span>
                      )}
                      <button
                        onClick={() => onToggleList(listName, title)}
                        className="text-[10px] text-[#68826b] hover:text-red-400"
                      >
                        REMOVE
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 border-t border-[#1f3823] pt-3 text-xs text-[#68826b]">
                  {query ? 'No titles match your search.' : 'No titles added yet.'}
                </p>
              )}
            </div>
            )
          })}
        </div>
      ) : (
        <EmptyState message="Create a list to organize your library." />
      )}
    </section>
  )
}
