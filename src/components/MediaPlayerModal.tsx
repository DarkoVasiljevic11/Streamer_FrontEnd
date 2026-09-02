import { Maximize, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MediaItem } from '../types'
import { fetchSubtitleTracks } from '../utils/api'

const formatTime = (totalSeconds: number) => {
  const safe = Number.isFinite(totalSeconds) ? totalSeconds : 0
  const minutes = Math.floor(safe / 60)
  const seconds = Math.floor(safe % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function MediaPlayerModal({
  media,
  onClose,
  onProgress,
}: {
  media: MediaItem
  onClose: () => void
  onProgress?: (progress: number) => void
}) {
  const [quality, setQuality] = useState(media.variants?.[0]?.quality ?? '1080p')
  const [subtitles, setSubtitles] = useState(
    media.subtitleTracks?.[0]?.label ?? (media.subtitleUrl ? 'English' : 'Off'),
  )
  const [volume, setVolume] = useState(74)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [subtitleTracks, setSubtitleTracks] = useState(media.subtitleTracks ?? [])
  const [subtitleError, setSubtitleError] = useState<string | null>(null)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerRef = useRef<HTMLDivElement | null>(null)
  const lastReportedProgress = useRef(-1)

  useEffect(() => {
    setSubtitleTracks(media.subtitleTracks ?? [])
    setSubtitleError(null)
    let active = true
    void fetchSubtitleTracks(media.id)
      .then((tracks) => {
        if (!active) return
        if (tracks.length) setSubtitleTracks(tracks)
        else if (!media.subtitleUrl && !media.subtitleTracks?.length) setSubtitleError('No subtitles are available for this title.')
      })
      .catch(() => {
        if (active && !media.subtitleUrl && !media.subtitleTracks?.length) {
          setSubtitleError('Subtitle service is unavailable.')
        }
      })
    return () => {
      active = false
    }
  }, [media])

  const sourceUrl = useMemo(() => {
    const selectedVariant = media.variants?.find((variant) => variant.quality === quality)
    return selectedVariant?.url || media.fileUrl || media.mediaUrl || ''
  }, [media, quality])

  const availableVariants = useMemo(() => {
    const variants = media.variants?.length ? media.variants : [{ quality: 'Original', url: sourceUrl }]
    return variants.filter((variant, index, all) => all.findIndex((candidate) => candidate.url === variant.url) === index)
  }, [media.variants, sourceUrl])

  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.volume = isMuted ? 0 : volume / 100
  }, [volume, isMuted, sourceUrl])

  useEffect(() => {
    const track = videoRef.current?.textTracks[0]
    if (track) track.mode = subtitles === 'Off' ? 'disabled' : 'showing'
  }, [subtitles, subtitleTracks, sourceUrl])

  useEffect(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      void videoRef.current.play().catch(() => {
        setIsPlaying(false)
      })
      return
    }
    videoRef.current.pause()
  }, [isPlaying, sourceUrl])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
        setIsPlaying((current) => !current)
      }
      if (event.code === 'ArrowRight') {
        event.preventDefault()
        if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, videoRef.current.duration || Number.POSITIVE_INFINITY)
      }
      if (event.code === 'ArrowLeft') {
        event.preventDefault()
        if (videoRef.current) videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0)
      }
      if (event.code === 'KeyM') {
        event.preventDefault()
        setIsMuted((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const reportProgress = (video: HTMLVideoElement) => {
    if (!onProgress || !Number.isFinite(video.duration) || video.duration <= 0) return
    const progress = Math.min(100, Math.max(0, Math.round((video.currentTime / video.duration) * 100)))
    if (progress === lastReportedProgress.current) return
    lastReportedProgress.current = progress
    onProgress(progress)
  }

  const toggleFullscreen = () => {
    const target = videoRef.current ?? playerRef.current
    if (!target) return
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => setPlayerError('Unable to exit fullscreen mode.'))
    } else {
      if (!document.fullscreenEnabled || !target.requestFullscreen) {
        setPlayerError('Fullscreen is not supported by this browser.')
        return
      }
      void target.requestFullscreen().catch(() => {
        setPlayerError('Fullscreen was blocked by the browser.')
      })
    }
  }

  return (
    <div
      ref={playerRef}
      className="fixed inset-0 z-20 grid place-items-center bg-[#020603f2] p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl overflow-hidden rounded-2xl border border-[#355b3e] bg-[#0a160f] shadow-[0_24px_100px_#000] ring-1 ring-white/5"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Playing ${media.title}`}
      >
        <div className="relative aspect-video overflow-hidden bg-[#050907]">
          <button
            aria-label="Close player"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/45 text-[#d6ffd0] backdrop-blur transition hover:bg-[#8dff66] hover:text-[#07100b] focus:outline-none focus:ring-2 focus:ring-[#8dff66]"
          >
            <X size={17} />
          </button>

          {sourceUrl ? (
            <video
              ref={videoRef}
              key={`${media.id}-${quality}`}
              muted={isMuted}
              playsInline
              preload="auto"
              poster={media.posterUrl}
              className="h-full w-full bg-black object-cover"
              style={{ backgroundImage: media.posterUrl ? `url(${media.posterUrl})` : undefined }}
              onLoadedMetadata={(event) => {
                setDuration(event.currentTarget.duration || 0)
                setPlayerError(null)
              }}
              onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
              onError={() => setPlayerError('The uploaded media could not be loaded. Check the file format and backend URL.')}
              onClick={(event) => {
                event.stopPropagation()
                setIsPlaying((current) => !current)
              }}
              onTimeUpdate={(event) => {
                setCurrentTime(event.currentTarget.currentTime || 0)
                reportProgress(event.currentTarget)
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={(event) => {
                setIsPlaying(false)
                reportProgress(event.currentTarget)
              }}
              onEnded={(event) => {
                setIsPlaying(false)
                reportProgress(event.currentTarget)
              }}
            >
              <source src={sourceUrl} />
              {subtitles !== 'Off' && (
                <track
                  key={subtitles}
                  default
                  kind="subtitles"
                  src={
                    subtitleTracks.find((track) => track.label === subtitles)?.url ??
                    media.subtitleUrl ??
                    ''
                  }
                  srcLang={subtitleTracks.find((track) => track.label === subtitles)?.language ?? 'en'}
                  label={subtitles}
                />
              )}
            </video>
          ) : (
            <div
              className="grid h-full place-items-center bg-cover bg-center"
              style={{ backgroundImage: media.posterUrl ? `url(${media.posterUrl})` : undefined }}
            >
              <div className="rounded-full bg-[#07100bcc] p-6 text-[#8dff66]">
                <Play size={25} fill="currentColor" />
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 w-full bg-gradient-to-t from-[#020603] via-[#020603e8] to-transparent px-5 pb-5 pt-16">
           <div className="relative z-10 mb-4 h-1.5 w-full rounded-full bg-white/20">
              <input
                aria-label="Seek"
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={Math.min(currentTime, duration || currentTime || 100)}
                onChange={(event) => {
                  event.stopPropagation()
                  const value = Number(event.target.value)
                  setCurrentTime(value)
                  if (videoRef.current) {
                    videoRef.current.currentTime = value
                    reportProgress(videoRef.current)
                  }
                }}
                onInput={(event) => {
                  const value = Number(event.currentTarget.value)
                  setCurrentTime(value)
                  if (videoRef.current) videoRef.current.currentTime = value
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className="h-full w-full cursor-pointer accent-[#8dff66]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[#d6ffd0]">
              <button
                type="button"
                onClick={() => setIsPlaying((current) => !current)}
                className="grid h-9 w-9 place-items-center rounded-full bg-[#8dff66] text-[#07100b] transition hover:bg-[#baffaa] focus:outline-none focus:ring-2 focus:ring-white/60"
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>
              <span className="min-w-[76px] text-xs font-medium tabular-nums text-[#d6ffd0]">
                {formatTime(currentTime)} <span className="text-[#78977d]">/ {formatTime(duration)}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsMuted((current) => !current)}
                className="grid h-9 w-9 place-items-center rounded-full text-[#d6ffd0] transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#8dff66]"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                aria-label="Volume"
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(event) => {
                  event.stopPropagation()
                  const next = Number(event.target.value)
                  setVolume(next)
                  setIsMuted(next === 0)
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className="w-24 cursor-pointer accent-[#8dff66]"
              />
              <span className="mr-auto hidden text-[10px] uppercase tracking-[0.18em] text-[#78977d] sm:inline">
                {media.title}
              </span>
              <select
                aria-label="Quality"
                value={quality}
                onChange={(event) => setQuality(event.target.value)}
                className="rounded-lg border border-white/10 bg-white/10 px-2 py-2 text-[10px] text-[#d6ffd0] outline-none transition hover:bg-white/15 focus:ring-2 focus:ring-[#8dff66]"
              >
                {availableVariants.map((variant) => (
                  <option key={variant.quality} value={variant.quality}>
                    {variant.quality}
                  </option>
                ))}
              </select>
              <select
                aria-label="Subtitles"
                value={subtitles}
                onChange={(event) => setSubtitles(event.target.value)}
                className="rounded-lg border border-white/10 bg-white/10 px-2 py-2 text-[10px] text-[#d6ffd0] outline-none transition hover:bg-white/15 focus:ring-2 focus:ring-[#8dff66]"
              >
                {subtitleTracks.map((track) => (
                  <option key={`${track.language}-${track.label}`} value={track.label}>
                    {track.label}
                  </option>
                ))}
                {media.subtitleUrl && !subtitleTracks.length && <option value="English">English</option>}
                <option value="Off">Off</option>
              </select>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/10 text-[#d6ffd0] transition hover:bg-[#8dff66] hover:text-[#07100b] focus:outline-none focus:ring-2 focus:ring-[#8dff66]"
                aria-label="Toggle fullscreen"
              >
                <Maximize size={16} />
              </button>
            </div>
            {subtitleError && <p className="mt-2 text-xs text-[#d8b56a]">{subtitleError}</p>}
            {playerError && <p className="mt-2 text-xs text-[#ff9d9d]">{playerError}</p>}
          </div>
        </div>
        <div className="border-t border-white/5 px-6 py-5">
          <span className="text-[10px] font-semibold tracking-[0.22em] text-[#8dff66]">NOW PLAYING</span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#e0fbd9]">{media.title}</h2>
          <p className="mt-1 text-xs text-[#78977d]">
            {media.year ?? 'Library'} · Streaming from your library
          </p>
        </div>
      </div>
    </div>
  )
}
