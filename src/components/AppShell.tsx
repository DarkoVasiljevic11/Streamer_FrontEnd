import { Film, Home, List, Shield } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

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
}

const navItems = [
  { label: 'Home', icon: Home, to: '/' },
  { label: 'Movies', icon: Film, to: '/movies' },
  { label: 'Series', icon: Film, to: '/series' },
  { label: 'My list', icon: List, to: '/list' },
  { label: 'Admin', icon: Shield, to: '/admin' },
]

export function AppShell({ children, profileName, profileInitials, savedCount, isDemo, apiError, loading, query, onQueryChange }: AppShellProps) {
  const location = useLocation()
  const pageName = location.pathname === '/list' ? 'MY LISTS' : location.pathname === '/profile' ? 'PROFILE' : location.pathname === '/movies' ? 'MOVIES' : location.pathname === '/series' ? 'SERIES' : location.pathname === '/admin' ? 'ADMIN' : 'HOME'
  return (
    <div className="min-h-screen bg-[#07100b] font-mono text-[#d8e6d7] selection:bg-[#8dff66] selection:text-[#07100b]">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-[#1f3823] bg-[#09130c] p-7 lg:flex lg:flex-col">
        <Link to="/" className="mb-16 text-xl font-bold tracking-[-0.12em] text-[#c7f5bc]"><span className="mr-2 text-[#8dff66]">✦</span>stream<span className="text-[#8dff66]">er</span></Link>
        <nav className="grid gap-2">
          {navItems.map(({ label, icon: Icon, to }) => <NavLink key={label} to={to} className={({ isActive }) => `flex items-center gap-3 border-l-2 px-4 py-3 text-sm transition ${isActive ? 'border-[#8dff66] bg-[#102418] text-[#baffaa]' : 'border-transparent text-[#68826b] hover:bg-[#0d1e12] hover:text-[#baffaa]'}`}><Icon size={17} />{label}{label === 'My list' && <span className="ml-auto text-xs text-[#8dff66]">{savedCount}</span>}</NavLink>)}
        </nav>
        <div className="mt-auto border border-[#1f3823] bg-[#0c1a0f] p-3 text-[10px] text-[#769078]"><span className={`mr-2 ${apiError && !isDemo ? 'text-red-400' : 'text-[#8dff66]'}`}>●</span>{loading ? 'CONNECTING...' : isDemo ? 'DEMO PREVIEW' : apiError ? 'SERVER OFFLINE' : 'SERVER ONLINE'}{!apiError && !isDemo && <strong className="float-right font-normal text-[#8dff66]">READY</strong>}</div>
      </aside>
      <main className="mx-auto max-w-[1450px] px-5 lg:ml-60 lg:px-14">
        <header className="flex h-20 items-center gap-5 border-b border-[#1f3823]">
          <Link to="/" className="font-bold tracking-[-0.12em] text-[#c7f5bc] lg:hidden"><span className="mr-2 text-[#8dff66]">✦</span>streamer</Link>
          <div className="hidden text-[11px] tracking-widest text-[#668066] lg:block"><span className="text-[#8dff66]">LIBRARY</span> / {pageName}</div>
          <label className="ml-auto flex w-full max-w-xs items-center gap-2 border-b border-[#29442c] py-2 text-[#668066]"><input aria-label="Search archive" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="search archive..." className="w-full bg-transparent text-xs text-[#c7f5bc] outline-none placeholder:text-[#526b56]" /></label><Link to="/profile" className="flex items-center gap-2 border-l border-[#1f3823] pl-4 text-xs text-[#b5d7b0] hover:text-[#8dff66]"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#254d2b] text-[10px] text-[#baffaa]">{profileInitials}</span>{profileName}</Link>
        </header>
        {apiError && <div className={`my-5 border px-4 py-3 text-xs ${isDemo ? 'border-[#416846] bg-[#0c1a0f] text-[#b5d7b0]' : 'border-red-900 bg-[#1a0c0c] text-red-200'}`} role="status"><strong>{isDemo ? 'DEMO PREVIEW: ' : 'OFFLINE: '}</strong>{isDemo ? 'The backend is not configured; displayed titles are sample data only.' : 'The backend is unavailable. No live media data is being shown.'}</div>}
        {children}
      </main>
    </div>
  )
}
