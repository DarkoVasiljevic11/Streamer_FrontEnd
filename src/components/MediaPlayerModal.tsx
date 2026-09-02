import { Play, Volume2, X } from 'lucide-react'
import { useState } from 'react'
import type { MediaItem } from '../types'

export function MediaPlayerModal({ media, onClose }: { media: MediaItem; onClose: () => void }) {
  const [quality, setQuality] = useState('1080p')
  const [subtitles, setSubtitles] = useState('English')
  const [volume, setVolume] = useState(74)
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-[#020603e8] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl border border-[#416846] bg-[#09130c] shadow-[0_20px_100px_#000]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Playing ${media.title}`}
      >
        <div
          className="relative aspect-video bg-cover bg-center"
          style={{ backgroundImage: media.posterUrl ? `url(${media.posterUrl})` : undefined }}
        >
          <button
            aria-label="Close player"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center bg-[#07100bcc] text-[#baffaa]"
          >
            <X size={17} />
          </button>
          <div className="absolute inset-0 grid place-items-center bg-[#07100b66]">
            <button
              aria-label="Play"
              className="grid h-16 w-16 place-items-center rounded-full bg-[#8dff66] text-[#07100b]"
            >
              <Play size={25} fill="currentColor" />
            </button>
          </div>
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#020603] p-5">
            <div className="mb-3 h-1 bg-[#49634b]">
              <span className="block h-full w-1/4 bg-[#8dff66]" />
            </div>
            <div className="flex items-center gap-4 text-[#baffaa]">
              <Play size={16} fill="currentColor" />
              <span className="text-xs">10</span>
              <Volume2 size={16} />
              <input
                aria-label="Volume"
                type="range"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-20 accent-[#8dff66]"
              />
              <span className="mr-auto text-[10px] text-[#769078]">42:18 / 2:46:12</span>
              <select
                aria-label="Quality"
                value={quality}
                onChange={(event) => setQuality(event.target.value)}
                className="bg-[#102418] p-1 text-[10px]"
              >
                <option>1080p</option>
                <option>720p</option>
                <option>480p</option>
              </select>
              <select
                aria-label="Subtitles"
                value={subtitles}
                onChange={(event) => setSubtitles(event.target.value)}
                className="bg-[#102418] p-1 text-[10px]"
              >
                <option>English</option>
                <option>Off</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-5">
          <span className="text-[10px] tracking-widest text-[#8dff66]">— NOW PLAYING</span>
          <h2 className="mt-2 text-xl font-bold text-[#c7f5bc]">{media.title}</h2>
          <p className="mt-1 text-[10px] text-[#68826b]">
            {media.year ?? 'Library'} · Streaming from your library
          </p>
        </div>
      </div>
    </div>
  )
}
