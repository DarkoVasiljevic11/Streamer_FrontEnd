import { Maximize, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import Hls from 'hls.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MediaItem } from '../types'
import { fetchSubtitleTracks, searchSubtitles } from '../utils/api'

type Props = {
  media: MediaItem
  onClose: () => void
  onProgress?: (progress: number) => void
}

export default function MediaPlayerModal({ media, onClose, onProgress }: Props) {
  const [quality, setQuality] = useState(
    media.variants?.[0]?.quality ?? '1080p',
  )

  const [subtitles, setSubtitles] = useState('Off')
  const [volume, setVolume] = useState(74)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)

  const [subtitleTracks, setSubtitleTracks] = useState(
    media.subtitleTracks ?? [],
  )

  const [subtitleError, setSubtitleError] = useState<string | null>(null)
  const [playerError, setPlayerError] = useState<string | null>(null)

  /*
   * True while waiting on the server for the manifest/first
   * segment - i.e. FFmpeg cold-starting a transcode. Shown as a
   * spinner so the player doesn't just look frozen on first play.
   */
  const [isBuffering, setIsBuffering] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerRef = useRef<HTMLDivElement | null>(null)

  const lastReportedProgress = useRef(-1)
  const hlsRef = useRef<Hls | null>(null)

  const sourceUrl = useMemo(() => {
    const selectedVariant = media.variants?.find(
      (variant) => variant.quality === quality,
    )

    return (
      selectedVariant?.url ||
      media.fileUrl ||
      media.mediaUrl ||
      ''
    )
  }, [media, quality])

  /*
   * Load subtitle tracks: whatever's statically configured on the
   * media item, plus anything found via online subtitle search
   * (see subtitles.go on the backend - this calls Wyzie Subs
   * through our own proxy, never the provider directly).
   */
  useEffect(() => {
    let cancelled = false

    const loadSubtitles = async () => {
      setSubtitleError(null)

      const [staticResult, searchResult] = await Promise.allSettled([
        fetchSubtitleTracks(media.id),
        searchSubtitles(media.id),
      ])

      if (cancelled) return

      const combined = [
        ...(staticResult.status === 'fulfilled' && staticResult.value ? staticResult.value : []),
      ]

      if (searchResult.status === 'fulfilled') {
        if (searchResult.value.message) {
          console.info('[subtitles]', searchResult.value.message)
        }

        /*
         * De-dupe by label so a title that already has a manually
         * configured track for a language doesn't show it twice.
         */
        const existingLabels = new Set(combined.map((track) => track.label))
        for (const track of searchResult.value.results) {
          if (existingLabels.has(track.label)) continue
          existingLabels.add(track.label)
          combined.push(track)
        }
      } else {
        console.error('Online subtitle search failed:', searchResult.reason)
      }

      setSubtitleTracks(combined)

      if (staticResult.status === 'rejected') {
        console.error('Failed to load subtitle tracks:', staticResult.reason)
        setSubtitleError('Unable to load some subtitles.')
      }
    }

    if (media.id) {
      void loadSubtitles()
    }

    return () => {
      cancelled = true
    }
  }, [media.id])

  /*
   * HLS / video setup
   */
  useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return
    }

    // Destroy previous HLS instance
    hlsRef.current?.destroy()
    hlsRef.current = null

    setPlayerError(null)
    setCurrentTime(0)
    setDuration(0)

    /*
     * Any (re)load starts in a buffering state: for HLS this
     * covers FFmpeg's cold-start transcode; the flag is cleared
     * once the manifest is parsed (HLS) or metadata loads
     * (native video), or on error.
     */
    setIsBuffering(true)

    if (!sourceUrl) {
      setPlayerError('No video source was provided.')
      setIsBuffering(false)
      return
    }

    /*
     * HLS
     */
    if (sourceUrl.endsWith('.m3u8')) {
      /*
       * Safari / browsers with native HLS support
       */
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = sourceUrl
        video.load()

        return () => {
          video.removeAttribute('src')
          video.load()
        }
      }

      /*
       * hls.js
       */
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,

          /*
           * This is VOD-style playback, not low-latency live streaming.
           */
          lowLatencyMode: false,

          /*
           * Give the player substantially more room to buffer.
           */
          maxBufferLength: 60,
          maxMaxBufferLength: 120,
          backBufferLength: 30,

          /*
           * Do NOT force the player to behave like a live stream.
           */
          liveSyncDurationCount: undefined,
          liveMaxLatencyDurationCount: undefined,

          /*
           * Retry transient network failures.
           */
          fragLoadingMaxRetry: 6,
          manifestLoadingMaxRetry: 6,
          levelLoadingMaxRetry: 6,

          /*
           * IMPORTANT:
           *
           * The backend deliberately BLOCKS the index.m3u8 request
           * until FFmpeg has produced the first HLS segment (see
           * ensureHLS/waitForHLS on the server). For a freshly
           * requested HEVC/10-bit source that cold-start transcode
           * can easily take longer than hls.js's default 10s
           * manifest/level timeout.
           *
           * Without raising these, hls.js aborts the request before
           * the server ever responds, which is why the very first
           * "Play" can fail (or need a couple of retries) even
           * though the stream is actually still being generated
           * server-side in the background - a subsequent attempt
           * then lands after the first segment is ready and just
           * works. Raising the timeouts lets the *first* attempt
           * wait for it instead.
           */
          manifestLoadingTimeOut: 120_000,
          levelLoadingTimeOut: 120_000,
          fragLoadingTimeOut: 60_000,

          /*
           * Always start at the beginning, never at the "live
           * edge". Belt-and-suspenders alongside the backend
           * sending -hls_playlist_type vod: without this, a
           * client that loads the manifest in the split second
           * before that tag is written would still auto-seek into
           * the stream instead of starting at 0.
           */
          startPosition: 0,
        })

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('[HLS] Media attached')
        })

        hls.on(Hls.Events.MANIFEST_LOADING, (_, data) => {
          console.log('[HLS] Loading manifest:', data.url)
        })

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          console.log(
            '[HLS] Manifest parsed:',
            data.levels.length,
            'levels',
          )

          setIsBuffering(false)
        })

        hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
          console.log('[HLS] Segment loaded:', data.frag.sn)
        })

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error('[HLS ERROR]', data)

          if (!data.fatal) {
            return
          }

          setIsBuffering(false)

          /*
           * Network error
           */
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.warn(
              '[HLS] Fatal network error, restarting load...',
            )

            hls.startLoad()
            return
          }

          /*
           * Media/decode error
           */
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.warn(
              '[HLS] Fatal media error, recovering...',
            )

            hls.recoverMediaError()
            return
          }

          /*
           * Completely unrecoverable error
           */
          setIsPlaying(false)

          setPlayerError(
            `The stream could not be decoded${
              data.details ? ` (${data.details})` : ''
            }.`,
          )
        })

        /*
         * IMPORTANT:
         * Attach the video first, then load the source.
         */
        hls.attachMedia(video)
        hls.loadSource(sourceUrl)

        hlsRef.current = hls

        return () => {
          hls.destroy()
          hlsRef.current = null

          video.removeAttribute('src')
          video.load()
        }
      }

      setPlayerError(
        'This browser does not support HLS playback.',
      )

      return
    }

    /*
     * Normal video file
     */
    video.src = sourceUrl
    video.load()

    return () => {
      video.removeAttribute('src')
      video.load()
    }
  }, [sourceUrl])

  /*
   * Volume
   */
  useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return
    }

    video.volume = isMuted ? 0 : volume / 100
    video.muted = isMuted
  }, [volume, isMuted, sourceUrl])

  /*
   * Subtitle visibility
   */
  useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return
    }

    const tracks = video.textTracks

    if (!tracks) {
      return
    }

    for (let index = 0; index < tracks.length; index += 1) {
      const track = tracks[index]

      track.mode =
        subtitles === 'Off' ||
        track.label !== subtitles
          ? 'disabled'
          : 'showing'
    }
  }, [subtitles, subtitleTracks, sourceUrl])

  /*
   * Play / pause
   */
  useEffect(() => {
    const video = videoRef.current

    if (!video) {
      return
    }

    if (isPlaying) {
      void video.play().catch((error) => {
        console.error('Video play failed:', error)
        setIsPlaying(false)
      })

      return
    }

    video.pause()
  }, [isPlaying, sourceUrl])

  /*
   * Progress reporting
   */
  const reportProgress = (video: HTMLVideoElement) => {
    const current = video.currentTime || 0

    /*
     * Avoid repeatedly reporting the exact same timestamp.
     */
    if (Math.abs(current - lastReportedProgress.current) < 5) {
      return
    }

    lastReportedProgress.current = current

    /*
     * Report progress as a 0-100 percentage, matching how
     * continueWatching entries are stored and rendered
     * (see MediaCard's progress bar width).
     */
    const total = video.duration || 0

    if (!onProgress || !Number.isFinite(total) || total <= 0) {
      return
    }

    const percentage = Math.min(100, Math.max(0, (current / total) * 100))

    onProgress(percentage)
  }

  /*
   * Format seconds as HH:MM:SS / MM:SS
   */
  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '00:00'
    }

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours
        .toString()
        .padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`
    }

    return `${minutes
      .toString()
      .padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`
  }

  /*
   * Seek
   */
  const handleSeek = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const video = videoRef.current

    if (!video) {
      return
    }

    const value = Number(event.target.value)

    video.currentTime = value
    setCurrentTime(value)
  }

  /*
   * Toggle fullscreen
   */
  const handleFullscreen = async () => {
    if (!playerRef.current) {
      return
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await playerRef.current.requestFullscreen()
      }
    } catch (error) {
      console.error('Fullscreen error:', error)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        ref={playerRef}
        className="relative flex h-full max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-black shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent p-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {media.title}
            </h2>

            {media.description && (
              <p className="mt-1 line-clamp-1 text-sm text-white/70">
                {media.description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-black/50 p-2 text-white transition hover:bg-black/80"
          >
            <X size={22} />
          </button>
        </div>

        {/* Video */}
        <div className="relative flex-1 overflow-hidden bg-black">
          <video
            ref={videoRef}
            key={`${media.id}-${quality}`}
            muted={isMuted}
            playsInline
            preload="auto"
            poster={media.posterUrl}
            className="h-full w-full bg-black object-contain"
            style={{
              backgroundImage: media.posterUrl
                ? `url(${media.posterUrl})`
                : undefined,
            }}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget

              video.volume = volume / 100
              video.muted = isMuted

              setDuration(video.duration || 0)
              setPlayerError(null)
              setIsBuffering(false)
            }}
            onDurationChange={(event) => {
              setDuration(
                event.currentTarget.duration || 0,
              )
            }}
            onError={(event) => {
              /*
               * IMPORTANT:
               *
               * When hls.js is attached, it owns error reporting
               * (see Hls.Events.ERROR above, which already calls
               * setPlayerError for genuinely fatal cases and
               * silently retries/recovers everything else via
               * hls.startLoad()/hls.recoverMediaError()).
               *
               * The native <video> 'error' event can ALSO fire
               * for the exact same underlying MSE hiccup hls.js is
               * already auto-recovering from (a transient decode
               * stall at a segment boundary is common with the
               * fast/low-effort encode settings used for cheap
               * live transcoding). If we let this handler show a
               * fatal overlay too, it stomps on hls.js's recovery
               * before the user ever sees it succeed - which looks
               * exactly like "plays a bit, then fails" even though
               * the stream would have kept going fine.
               *
               * So: only treat the native error as fatal when
               * hls.js is NOT managing this <video> (plain file
               * playback, or Safari's native HLS path).
               */
              if (hlsRef.current) {
                console.warn(
                  '[video] native error event while hls.js is active - ignoring, hls.js owns recovery',
                  event.currentTarget.error,
                )
                return
              }

              setIsBuffering(false)
              setPlayerError(
                'The uploaded media could not be loaded. Check the file format and backend URL.',
              )
            }}
            onLoadedData={(event) => {
              const tracks = event.currentTarget.textTracks

              for (
                let index = 0;
                index < tracks.length;
                index += 1
              ) {
                tracks[index].mode =
                  subtitles === 'Off' ||
                  tracks[index].label !== subtitles
                    ? 'disabled'
                    : 'showing'
              }
            }}
            onClick={(event) => {
              event.stopPropagation()
              setIsPlaying((current) => !current)
            }}
            onTimeUpdate={(event) => {
              const video = event.currentTarget

              setCurrentTime(
                video.currentTime || 0,
              )

              reportProgress(video)
            }}
            onPlay={() => {
              setIsPlaying(true)
            }}
            onPause={(event) => {
              setIsPlaying(false)
              reportProgress(event.currentTarget)
            }}
            onEnded={(event) => {
              setIsPlaying(false)
              reportProgress(event.currentTarget)
            }}
          >
            {subtitles !== 'Off' && (
              <track
                key={subtitles}
                default
                kind="subtitles"
                src={
                  subtitleTracks.find(
                    (track) =>
                      track.label === subtitles,
                  )?.url ??
                  media.subtitleUrl ??
                  ''
                }
                srcLang={
                  subtitleTracks.find(
                    (track) =>
                      track.label === subtitles,
                  )?.language ?? 'en'
                }
                label={subtitles}
              />
            )}
          </video>

          {/* Player error */}
          {playerError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
              <div className="max-w-lg text-center">
                <p className="text-lg font-medium text-red-400">
                  Playback error
                </p>

                <p className="mt-2 text-sm text-white/70">
                  {playerError}
                </p>
              </div>
            </div>
          )}

          {/* Buffering / cold-start transcode indicator */}
          {isBuffering && !playerError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <p className="text-sm text-white/70">
                  Preparing stream…
                </p>
              </div>
            </div>
          )}

          {/* Center play button */}
          {!isPlaying && !playerError && !isBuffering && (
            <button
              type="button"
              onClick={() =>
                setIsPlaying(true)
              }
              className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition hover:scale-105"
            >
              <Play
                size={30}
                fill="currentColor"
              />
            </button>
          )}

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12">
            {/* Progress */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(
                currentTime,
                duration || 0,
              )}
              onChange={handleSeek}
              className="mb-3 w-full cursor-pointer"
            />

            <div className="flex items-center gap-3 text-white">
              {/* Play / pause */}
              <button
                type="button"
                onClick={() =>
                  setIsPlaying((current) => !current)
                }
                className="rounded p-1 transition hover:bg-white/10"
              >
                {isPlaying ? (
                  <Pause size={20} />
                ) : (
                  <Play
                    size={20}
                    fill="currentColor"
                  />
                )}
              </button>

              {/* Volume */}
              <button
                type="button"
                onClick={() =>
                  setIsMuted((current) => !current)
                }
                className="rounded p-1 transition hover:bg-white/10"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX size={20} />
                ) : (
                  <Volume2 size={20} />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(event) => {
                  const newVolume = Number(
                    event.target.value,
                  )

                  setVolume(newVolume)

                  if (newVolume > 0) {
                    setIsMuted(false)
                  }
                }}
                className="w-20 cursor-pointer"
              />

              {/* Time */}
              <span className="text-sm text-white/80">
                {formatTime(currentTime)} /{' '}
                {formatTime(duration)}
              </span>

              <div className="flex-1" />

              {/* Quality */}
              {media.variants &&
                media.variants.length > 0 && (
                  <select
                    value={quality}
                    onChange={(event) => {
                      setQuality(event.target.value)
                      setIsPlaying(false)
                    }}
                    className="rounded bg-black/70 px-2 py-1 text-sm text-white outline-none"
                  >
                    {media.variants.map(
                      (variant) => (
                        <option
                          key={variant.quality}
                          value={variant.quality}
                        >
                          {variant.quality}
                        </option>
                      ),
                    )}
                  </select>
                )}

              {/* Subtitles */}
              {(subtitleTracks.length > 0 ||
                media.subtitleUrl) && (
                <select
                  value={subtitles}
                  onChange={(event) =>
                    setSubtitles(event.target.value)
                  }
                  className="rounded bg-black/70 px-2 py-1 text-sm text-white outline-none"
                >
                  <option value="Off">
                    Subtitles Off
                  </option>

                  {subtitleTracks.map(
                    (track) => (
                      <option
                        key={
                          track.label
                        }
                        value={
                          track.label
                        }
                      >
                        {track.label}
                      </option>
                    ),
                  )}
                </select>
              )}

              {/* Fullscreen */}
              <button
                type="button"
                onClick={handleFullscreen}
                className="rounded p-1 transition hover:bg-white/10"
              >
                <Maximize size={20} />
              </button>
            </div>

            {subtitleError && (
              <p className="mt-2 text-xs text-red-400">
                {subtitleError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}