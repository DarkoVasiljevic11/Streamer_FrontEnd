import { useEffect, useState } from 'react'
import { Play, X } from 'lucide-react'
import { fetchEpisodes } from '../utils/api'
import type { MediaItem } from '../types'

type Props = {
  series: MediaItem
  onClose: () => void
  onPlayEpisode: (episode: MediaItem) => void
}

export function SeriesEpisodesModal({ series, onClose, onPlayEpisode }: Props) {
  const [episodes, setEpisodes] = useState<MediaItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    setEpisodes(null)
    setError(null)

    fetchEpisodes(series.id, controller.signal)
      .then(setEpisodes)
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Unable to load episodes.')
        setEpisodes([])
      })

    return () => controller.abort()
  }, [series.id])

  const seasons = new Map<number, MediaItem[]>()
  for (const episode of episodes ?? []) {
    const season = episode.season ?? 1
    if (!seasons.has(season)) seasons.set(season, [])
    seasons.get(season)!.push(episode)
  }
  const seasonNumbers = [...seasons.keys()].sort((a, b) => a - b)

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#020603e8] p-4"
      onClick={onClose}
    >
      <div
        className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#416846] bg-[#09130c] p-6 shadow-[0_20px_100px_#000]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#c7f5bc]">{series.title}</h2>
            {series.description && (
              <p className="mt-1 max-w-lg text-xs text-[#68826b]">{series.description}</p>
            )}
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 text-[#769078] hover:text-[#8dff66]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6">
          {episodes === null && !error && (
            <p className="py-10 text-center text-xs text-[#68826b]">Loading episodes…</p>
          )}

          {error && (
            <p className="py-10 text-center text-xs text-red-400">{error}</p>
          )}

          {episodes !== null && episodes.length === 0 && !error && (
            <p className="py-10 text-center text-xs text-[#68826b]">
              No episodes have been added for this series yet.
            </p>
          )}

          {seasonNumbers.map((seasonNumber) => (
            <div key={seasonNumber} className="mb-6 last:mb-0">
              <p className="mb-2 text-[10px] font-bold tracking-widest text-[#769078]">
                SEASON {seasonNumber}
              </p>
              <div className="flex flex-col gap-1">
                {seasons
                  .get(seasonNumber)!
                  .sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0))
                  .map((episode) => (
                    <button
                      key={episode.id}
                      onClick={() => onPlayEpisode(episode)}
                      className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-left hover:border-[#29442c] hover:bg-[#102418]"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a2e1d] text-[#8dff66] group-hover:bg-[#8dff66] group-hover:text-[#07100b]">
                        <Play size={14} fill="currentColor" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-[#c7f5bc]">
                          {episode.episodeNumber ? `${episode.episodeNumber}. ` : ''}
                          {episode.title}
                        </span>
                        {episode.description && (
                          <span className="mt-0.5 block truncate text-xs text-[#68826b]">
                            {episode.description}
                          </span>
                        )}
                      </span>
                      {typeof episode.progress === 'number' && episode.progress > 0 && (
                        <span className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-[#1f3823]">
                          <span
                            className="block h-full bg-[#8dff66]"
                            style={{ width: `${episode.progress}%` }}
                          />
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
