import { Film, Home, List, Menu, X } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
  profileName: string
  profileInitials: string
  savedCount: number
  isDemo: boolean
  apiError: string | null
  loading: boolean
  query: string
  onQueryChange: (value: string) => void
  searchSuggestions: string[]
  onSearchSelect: (value: string) => void
}

const navItems = [
  { label: 'Home', icon: Home, to: '/' },
  { label: 'Movies', icon: Film, to: '/movies' },
  { label: 'Series', icon: Film, to: '/series' },
  { label: 'My list', icon: List, to: '/list' },
]

const pageNames: Record<string, string> = {
  '/profile': 'PROFILE',
  '/movies': 'MOVIES',
  '/series': 'SERIES',
  '/continue': 'CONTINUE WATCHING',
  '/admin': 'ADMIN',
}

/*
 * The brand mark, nav list and server-status box are each used by
 * BOTH the desktop sidebar and the mobile menu drawer, so they live
 * here once instead of being duplicated in both.
 */
function Brand({ className = '', onClick }: { className?: string; onClick?: () => void }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={`text-xl font-bold tracking-[-0.12em] text-[#c7f5bc] ${className}`}
    >
      <span className="mr-2 text-[#8dff66]">✦</span>stream<span className="text-[#8dff66]">er</span>
    </Link>
  )
}

function NavLinks({ savedCount, onNavigate }: { savedCount: number; onNavigate?: () => void }) {
  return (
    <nav className="grid gap-2">
      {navItems.map(({ label, icon: Icon, to }) => (
        <NavLink
          key={label}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 border-l-2 px-4 py-3 text-sm transition ${isActive ? 'border-[#8dff66] bg-[#102418] text-[#baffaa]' : 'border-transparent text-[#68826b] hover:bg-[#0d1e12] hover:text-[#baffaa]'}`
          }
        >
          <Icon size={17} />
          {label}
          {label === 'My list' && <span className="ml-auto text-xs text-[#8dff66]">{savedCount}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

function ServerStatus({
  apiError,
  isDemo,
  loading,
}: {
  apiError: string | null
  isDemo: boolean
  loading: boolean
}) {
  return (
    <div className="mt-auto border border-[#1f3823] bg-[#0c1a0f] p-3 text-[10px] text-[#769078]">
      <span className={`mr-2 ${apiError && !isDemo ? 'text-red-400' : 'text-[#8dff66]'}`}>●</span>
      {loading
        ? 'CONNECTING...'
        : isDemo
          ? 'DEMO PREVIEW'
          : apiError
            ? 'SERVER OFFLINE'
            : 'SERVER ONLINE'}
      {!apiError && !isDemo && <strong className="float-right font-normal text-[#8dff66]">READY</strong>}
    </div>
  )
}

export function AppShell({
  children,
  profileName,
  profileInitials,
  savedCount,
  isDemo,
  apiError,
  loading,
  query,
  onQueryChange,
  searchSuggestions,
  onSearchSelect,
}: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  const pageName = location.pathname.startsWith('/list')
    ? 'MY LISTS'
    : (pageNames[location.pathname] ?? 'HOME')

  /*
   * While the mobile menu is open: lock background scroll, close on
   * Escape, and close if the window grows past the breakpoint where
   * the burger disappears (otherwise the scroll lock would be left
   * stuck on with no visible menu to dismiss).
   */
  useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onBreakpointChange = () => {
      if (desktop.matches) setMenuOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    desktop.addEventListener('change', onBreakpointChange)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
      desktop.removeEventListener('change', onBreakpointChange)
    }
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-[#07100b] font-mono text-[#d8e6d7] selection:bg-[#8dff66] selection:text-[#07100b]">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-[#1f3823] bg-[#09130c] p-7 lg:flex lg:flex-col">
        <Brand className="mb-16" />
        <NavLinks savedCount={savedCount} />
        <ServerStatus apiError={apiError} isDemo={isDemo} loading={loading} />
      </aside>

      {/*
        Always-on-top bar: sticky so search, profile and the burger stay
        visible while scrolling, on every screen size. z-40 puts it above
        all page content (highest in-page layer is z-20) but below the
        z-50 modals, so it never covers the player's own close button.
        Solid background (no backdrop-blur) - blur is costly to repaint
        on every scroll frame on phones.
      */}
      <header className="sticky top-0 z-40 border-b border-[#1f3823] bg-[#07100b] lg:ml-60">
        <div className="flex h-16 max-w-[1450px] items-center gap-3 px-5 lg:h-20 lg:gap-5 lg:px-14">
          <div className="hidden text-[11px] tracking-widest text-[#668066] lg:block">
            <span className="text-[#8dff66]">LIBRARY</span> / {pageName}
          </div>
          <label className="relative ml-auto flex min-w-0 flex-1 items-center gap-2 border-b border-[#29442c] py-2 text-[#668066] lg:max-w-xs">
            <input
              aria-label="Search archive"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && query.trim()) {
                  event.preventDefault()
                  navigate('/')
                }
              }}
              placeholder="search archive..."
              // 16px on phones: iOS Safari zooms the whole page when a
              // focused input is smaller than that.
              className="w-full min-w-0 cursor-text bg-transparent text-base text-[#c7f5bc] outline-none placeholder:text-[#526b56] lg:text-xs"
            />
            {query.trim() && searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-lg border border-[#29442c] bg-[#0b1910] p-1 shadow-2xl">
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      onSearchSelect(suggestion)
                      navigate('/')
                    }}
                    className="block w-full cursor-pointer rounded-md px-3 py-2 text-left text-xs text-[#b5d7b0] hover:bg-[#18351f] hover:text-[#baffaa]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </label>
          <Link
            to="/profile"
            aria-label={`Profile: ${profileName}`}
            title={profileName}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#254d2b] text-[11px] text-[#baffaa] transition hover:text-[#8dff66]"
          >
            {profileInitials}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="grid h-9 w-9 shrink-0 place-items-center text-[#b5d7b0] hover:text-[#8dff66] lg:hidden"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[45] lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={closeMenu}
            className="absolute inset-0 cursor-default bg-black/70"
          />
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col border-l border-[#1f3823] bg-[#09130c] p-6"
          >
            <div className="mb-10 flex items-center justify-between">
              <Brand onClick={closeMenu} />
              <button
                type="button"
                autoFocus
                onClick={closeMenu}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center text-[#b5d7b0] hover:text-[#8dff66]"
              >
                <X size={22} />
              </button>
            </div>
            <NavLinks savedCount={savedCount} onNavigate={closeMenu} />
            <ServerStatus apiError={apiError} isDemo={isDemo} loading={loading} />
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1450px] px-5 lg:ml-60 lg:px-14">
        {apiError && (
          <div
            className={`my-5 border px-4 py-3 text-xs ${isDemo ? 'border-[#416846] bg-[#0c1a0f] text-[#b5d7b0]' : 'border-red-900 bg-[#1a0c0c] text-red-200'}`}
            role="status"
          >
            <strong>{isDemo ? 'DEMO PREVIEW: ' : 'OFFLINE: '}</strong>
            {isDemo
              ? 'The backend is not configured; displayed titles are sample data only.'
              : 'The backend is unavailable. No live media data is being shown.'}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
