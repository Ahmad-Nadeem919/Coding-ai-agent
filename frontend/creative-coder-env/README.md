# Coding Agent — Web Workspace

The frontend for the Coding Agent. A Next.js app that gives the Python backend a
proper UI: streaming chat, a file explorer, a Monaco code editor, an embedded
terminal, and settings.

See the [root README](../..) for the full project overview and backend setup.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Radix UI primitives
- Zustand (state)
- Monaco Editor + xterm.js

## Running locally

```bash
npm install        # or: bun install

copy .env.example .env.local   # Windows
cp .env.example .env.local     # macOS / Linux

npm run dev        # http://localhost:8080
```

The dev server runs on port **8080**. Make sure the backend API is running on
`http://localhost:8000` first — that's the default in `.env.local`
(`NEXT_PUBLIC_API_URL`).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server on port 8080 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build on port 8080 |
| `npm run lint` | Run ESLint |
