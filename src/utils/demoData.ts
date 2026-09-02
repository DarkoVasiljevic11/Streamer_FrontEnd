import type { MediaItem } from '../types'

export const DEMO_MEDIA: MediaItem[] = [
  {
    id: 'demo-severance',
    title: 'Severance',
    type: 'series',
    genres: ['Sci-fi', 'Drama'],
    episodeLabel: 'S1 • E4 · The You You Are',
    posterUrl:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=85',
    progress: 63,
    source: 'demo',
  },
  {
    id: 'demo-voyage',
    title: 'The Last Voyage',
    type: 'movie',
    year: 2024,
    genres: ['Adventure'],
    duration: '1h 42m remaining',
    posterUrl:
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=85',
    progress: 28,
    source: 'demo',
  },
  {
    id: 'demo-neon',
    title: 'Neon Genesis',
    type: 'series',
    genres: ['Anime', 'Drama'],
    episodeLabel: 'S2 • E1 · Rebirth',
    posterUrl:
      'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85',
    progress: 81,
    source: 'demo',
  },
  {
    id: 'demo-after-yang',
    title: 'After Yang',
    type: 'movie',
    year: 2021,
    genres: ['Sci-fi', 'Drama'],
    posterUrl:
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=700&q=85',
    badge: '4K',
    source: 'demo',
  },
  {
    id: 'demo-past-lives',
    title: 'Past Lives',
    type: 'movie',
    year: 2023,
    genres: ['Romance', 'Drama'],
    posterUrl:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=85',
    badge: 'NEW',
    source: 'demo',
  },
  {
    id: 'demo-dune',
    title: 'Dune: Part Two',
    type: 'movie',
    year: 2024,
    genres: ['Epic', 'Adventure'],
    duration: '2h 46m',
    posterUrl:
      'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=700&q=85',
    badge: '4K',
    source: 'demo',
  },
  {
    id: 'demo-lighthouse',
    title: 'The Lighthouse',
    type: 'movie',
    year: 2019,
    genres: ['Thriller', 'Mystery'],
    posterUrl:
      'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=85',
    source: 'demo',
  },
]
