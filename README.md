## Streamer frontend

Set `VITE_API_URL` to the media backend origin (for example, `http://localhost:4000`) before running the app. The frontend expects:

- `GET /api/media` (an array of media records, or `{ "items": [] }`)
- `GET /api/media/preview?title=...`
- `GET /api/health`
- `POST /api/admin/media` as multipart form data with a Bearer token

When no API URL is configured, the UI explicitly labels its sample titles as **DEMO PREVIEW**. A configured but unavailable backend shows an offline/empty state instead.
