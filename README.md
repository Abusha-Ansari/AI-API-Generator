# SpecForge — AI API Generator

SpecForge validates and dereferences OpenAPI 3.x specifications (JSON or YAML) and transforms them into five production-ready developer artifacts via real-time Server-Sent Events (SSE) streaming.

Built for self-hosted **Bring Your Own Key (BYOK)** deployments: users supply their own Google Gemini, OpenAI, or Anthropic API key and choose any preset, live-fetched, or custom model directly from the browser UI—no server-side API keys required.

## Generated Artifacts

| # | Artifact | File Pattern | Details |
|---|----------|--------------|---------|
| 1 | **TypeScript SDK** | `*-sdk.ts` | Strongly typed client class (`fetch` or `axios`), exported interfaces, path/query serialization, and typed error handling |
| 2 | **API Documentation** | `*-docs.md` | GitHub-flavored Markdown reference with endpoint index, parameter tables, request/response JSON examples, and schemas |
| 3 | **Unit Tests** | `*.test.ts` | Self-contained Vitest or Jest test suite with mocked `fetch` and success + error test cases per endpoint |
| 4 | **Postman Collection** | `*.postman_collection.json` | Valid Postman Collection v2.1.0 JSON grouped by tag with `{{baseUrl}}` and `{{bearerToken}}` variables |
| 5 | **Request Examples** | `*-examples.md` | Copy-pasteable `cURL` commands and TypeScript `fetch` snippets for every endpoint |

## Core Features

- **OpenAPI 3.0 & 3.1 Validation**: Validates and dereferences `$ref` schemas server-side using `@apidevtools/swagger-parser` and `js-yaml`, surfacing a full endpoint, tag, and schema inspector before generation.
- **Flexible Spec Ingestion**: Paste JSON/YAML directly, drag-and-drop `.json`/`.yaml`/`.yml` files, fetch remote OpenAPI URLs server-side, or start from three built-in presets.
- **Concurrent Real-Time Streaming**: Generates selected artifacts in parallel over SSE with live syntax-highlighted code output, line numbers, auto-scroll follow toggle, and instant cancellation.
- **Bring Your Own Key (BYOK) & Model Picker**:
  - Supports **Google Gemini**, **OpenAI**, and **Anthropic**.
  - Paste keys manually or load them from local `.env`, `.json`, `.key`, or `.txt` files.
  - Session-only browser storage by default (`sessionStorage`), with an opt-in checkbox for `localStorage`. Keys are forwarded per request via `x-provider-api-key` and never stored on the server.
  - Pick from curated presets, click **Fetch live models** to query your provider account, or enter any custom model ID.
- **Export & Workflow Utilities**: Copy clean code, download individual files, bulk-export all completed artifacts as a `.zip` archive (`jszip`), share specs via URL hash, browse local generation history, switch Dark/Light themes, and trigger generation with `Cmd/Ctrl + Enter`.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion (`motion/react`), Lucide Icons, JSZip
- **Backend**: Express, Vite middleware (dev) / static bundle serving (prod), `@apidevtools/swagger-parser`, `js-yaml`, `@google/genai`
- **Streaming**: Native HTTP Server-Sent Events (`text/event-stream`)

## Getting Started

### Prerequisites

- Node.js `>= 20` (recommended `22.x`)
- `npm`

### Installation & Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy optional environment template
cp .env.example .env

# 3. Start the full-stack dev server (Express + Vite on port 3000)
npm run dev
```

Open `http://localhost:3000` in your browser, navigate to **Workspace** (`/generate`), enter your provider API key (or load a `.env`/key file), validate a spec, and click **Generate**.

### Environment Variables

All API key environment variables are **optional**. Leave them blank when deploying as a public BYOK app where users bring their own keys.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Port for the Express server |
| `APP_URL` | No | `http://localhost:3000` | Public base URL of your deployment |
| `GEMINI_API_KEY` | No | — | Optional server fallback key for Google Gemini |
| `OPENAI_API_KEY` | No | — | Optional server fallback key for OpenAI |
| `ANTHROPIC_API_KEY` | No | — | Optional server fallback key for Anthropic |

## Production Build & Self-Hosting

```bash
# Build the frontend bundle into dist/
npm run build

# Run the production server
NODE_ENV=production PORT=3000 npm start
```

> **Note**: `npm start` executes `node server.ts`, which uses Node.js 22.6+ native TypeScript stripping (`--experimental-strip-types` is enabled by default in Node 22.18+). If deploying on an older Node 20 runtime, start with `NODE_ENV=production npx tsx server.ts`.

### Deploying to Vercel

SpecForge includes `vercel.json` and Vercel Serverless Functions under `api/`:

- **SPA Routing**: `vercel.json` rewrites all non-API paths (`/docs`, `/generate`, etc.) to `/index.html` so direct URL visits and page refreshes never 404.
- **Serverless API**: `/api/providers`, `/api/models`, `/api/parse-spec`, `/api/fetch-spec-url`, and `/api/generate` (SSE streaming) deploy automatically as Vercel Node Functions with zero extra configuration.
- **No Server Keys Required**: Leave environment variables empty for pure BYOK usage, or optionally add `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY` in Vercel Project Settings.

### Useful Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Runs the Express + Vite full-stack development server via `tsx` |
| `npm run build` | Builds the client application into `dist/` |
| `npm start` | Starts the Express production server serving `dist/` and `/api/*` |
| `npm run lint` | Runs TypeScript type-checking (`tsc --noEmit`) |
| `npm run clean` | Removes build output directories |

## API Routes

| Method & Endpoint | Description |
|-------------------|-------------|
| `GET /api/providers` | Returns supported providers, preset model lists, and whether optional server fallback keys exist |
| `POST /api/models` | Queries live available models from the chosen provider using `x-provider-api-key` (or optional server fallback) |
| `POST /api/parse-spec` | Validates and dereferences a raw OpenAPI 3.x JSON or YAML string and returns endpoint/tag/schema summaries |
| `POST /api/fetch-spec-url` | Fetches an external `http(s)` OpenAPI spec server-side (blocking localhost/private IPs) and validates it |
| `POST /api/generate` | Streams a generated artifact (`sdk`, `docs`, `tests`, `postman`, or `examples`) as SSE (`chunk`, `done`, `error` events) |

## Project Structure

```text
.
├── api/                         # Vercel Serverless Function entrypoints (/api/*)
│   ├── _helpers.ts              # Shared request/response JSON helpers
│   ├── fetch-spec-url.ts        # POST /api/fetch-spec-url
│   ├── generate.ts              # POST /api/generate (SSE streaming)
│   ├── models.ts                # POST /api/models
│   ├── parse-spec.ts            # POST /api/parse-spec
│   └── providers.ts             # GET /api/providers
├── public/
│   ├── favicon.svg              # SVG brand icon
│   ├── robots.txt               # Search crawler directives
│   └── site.webmanifest         # Web app manifest metadata
├── server/
│   ├── parse-spec.ts            # OpenAPI JSON/YAML validation & dereferencing
│   ├── prompts.ts               # Artifact-specific system instructions & prompts
│   └── providers.ts             # Multi-provider streaming & model listing adapter
├── src/
│   ├── components/
│   │   ├── ArtifactSelector.tsx # Artifact checkboxes, BYOK key input, model selector
│   │   ├── DocsPage.tsx         # Pipeline & BYOK documentation page
│   │   ├── GeneratorWorkspace.tsx # Main generator orchestrator & SSE client
│   │   ├── LandingPage.tsx      # Overview landing page & preset launcher
│   │   ├── OutputPanel.tsx      # Tabbed viewer, copy, file & ZIP download
│   │   ├── SpecInput.tsx        # Spec editor, file dropzone, URL import, route table
│   │   ├── SpecPipelineVisual.tsx # Interactive 2D animated pipeline schematic
│   │   ├── StreamingCodeBlock.tsx # Syntax-highlighted streaming code display
│   │   └── TopNav.tsx           # Primary navigation bar
│   ├── lib/
│   │   ├── artifacts.ts         # Artifact metadata, filenames, code-fence stripping
│   │   └── sample-specs.ts      # Built-in OpenAPI 3.0 & 3.1 YAML/JSON presets
│   ├── types/
│   │   └── index.ts             # Shared TypeScript interfaces
│   ├── App.tsx                  # Client routing, theme & per-route SEO metadata
│   ├── index.css                # Tailwind v4 setup & typography tokens
│   └── main.tsx                 # React entry point
├── index.html                   # HTML shell with SEO, OpenGraph, Twitter & JSON-LD
├── server.ts                    # Express server + Vite dev middleware
├── vercel.json                  # Vercel build config & SPA fallback rewrite
└── package.json
```

## License

MIT
