import { Play, Plus } from 'lucide-react'
import { ListPicker } from './ListPicker'
import type { MediaCardProps } from '../types'

export function MediaCard({
  media,
  lists,
  listPicker,
  onListPickerChange,
  onToggleList,
  onCreateList,
  onPlay,
}: MediaCardProps) {
  const isSaved = Object.values(lists).some((items) => items.includes(media.title))
  const meta =
    media.type === 'series'
      ? (media.episodeLabel ?? media.genres.join(' / '))
      : [media.year, media.genres.join(' / ')].filter(Boolean).join(' · ')
  return (
    <article className="group">
      <div className="relative">
        <button
          onClick={() => onPlay(media)}
          className="relative block h-64 w-full overflow-hidden border border-[#1f3823] bg-cover bg-center grayscale-[40%] transition group-hover:grayscale-0"
          style={{ backgroundImage: media.posterUrl ? `url(${media.posterUrl})` : undefined }}
        >
          <span className="absolute inset-0 bg-gradient-to-t from-[#07100b]/80 to-transparent" />
          <span className="absolute bottom-3 left-3 text-[10px] text-[#baffaa]">
            PLAY {media.type === 'movie' ? 'MOVIE' : 'EPISODE'} →
          </span>
        </button>
        <button
          aria-label={`Add ${media.title} to a list`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onListPickerChange(listPicker === media.title ? null : media.title)}
          className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center bg-[#07100bcc] text-lg text-[#8dff66]"
        >
          {isSaved ? '✓' : <Plus size={16} />}
        </button>
        {listPicker === media.title && (
          <ListPicker
            title={media.title}
            lists={lists}
            onToggle={onToggleList}
            onCreate={onCreateList}
          />
        )}
      </div>
      <h3 className="mt-3 text-sm text-[#c7f5bc]">{media.title}</h3>
      <p className="mt-1 text-[10px] text-[#68826b]">{meta || 'Metadata unavailable'}</p>
    </article>
  )
}

export function ContinueCard({
  media,
  onPlay,
}: {
  media: MediaCardProps['media']
  onPlay: MediaCardProps['onPlay']
}) {
  const meta = media.episodeLabel ?? media.duration ?? media.genres.join(' / ')
  return (
    <article className="group cursor-pointer" onClick={() => onPlay(media)}>
      <div
        className="relative h-40 overflow-hidden border border-[#1f3823] bg-cover bg-center grayscale-[35%] transition group-hover:grayscale-0"
        style={{ backgroundImage: media.posterUrl ? `url(${media.posterUrl})` : undefined }}
      >
        <span className="absolute inset-0 bg-gradient-to-t from-[#07100b]/80 to-transparent" />
        <button
          aria-label={`Play ${media.title}`}
          className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[#baffaa] bg-[#07100bcc] text-[#8dff66] opacity-0 transition group-hover:opacity-100"
        >
          <Play size={15} fill="currentColor" />
        </button>
        <span
          className="absolute bottom-0 left-0 h-1 bg-[#8dff66]"
          style={{ width: `${media.progress ?? 0}%` }}
        />
      </div>
      <h3 className="mt-3 text-sm text-[#c7f5bc]">{media.title}</h3>
      <p className="mt-1 text-[10px] text-[#68826b]">{meta}</p>
    </article>
  )
}
