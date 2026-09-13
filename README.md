# AI Resume Analyzer — Backend (API)

Standalone Express + TypeScript API. Handles resume upload, parsing (PDF/DOCX),
AI-powered analysis (Google Gemini), rate limiting, and optional MySQL persistence.

This service is deploy-anywhere: Vercel (serverless), Render, Railway, Fly.io, or a
plain VM. It no longer serves the frontend — CORS is used to allow a separately
deployed frontend to call it.

## Project structure

```
backend/
├── api/
│   └── index.ts              # Vercel serverless entrypoint (wraps the Express app)
├── src/
│   ├── app.ts                # Express app factory (routes, middleware, CORS, helmet)
│   ├── config/
│   │   ├── env.ts            # Zod-validated environment variables
│   │   └── db.ts             # Optional MySQL/Sequelize connection
│   ├── controllers/
│   │   └── analysis.controller.ts
│   ├── middleware/
│   │   ├── upload.middleware.ts       # Multer (memory storage, 5MB limit)
│   │   ├── validate.middleware.ts     # Zod request validation
│   │   ├── rateLimiter.middleware.ts  # 100 req / 15 min
│   │   └── errorHandler.middleware.ts
│   ├── models/
│   │   └── analysis.model.ts # Sequelize model with in-memory fallback
│   ├── routes/
│   │   └── analysis.routes.ts
│   ├── services/
│   │   ├── aiAnalysis.service.ts   # Gemini prompt + deterministic fallback
│   │   ├── fileParser.service.ts   # PDF/DOCX text extraction
│   │   └── sanitizer.service.ts    # PII redaction & text cleanup
│   └── utils/
│       └── logger.ts
├── server.ts                 # Local dev / traditional Node hosting entrypoint
├── package.json
├── tsconfig.json
├── vercel.json                # Rewrites /api/* to the serverless function
└── .env.example
```

## API routes

All routes are mounted under both `/api` and `/api/v1`:

| Method | Route                        | Description                         |
|--------|-------------------------------|--------------------------------------|
| GET    | `/api/health`                 | Health check                         |
| POST   | `/api/v1/analyze`             | Upload resume + JD, run AI analysis  |
| GET    | `/api/v1/analyses/:sessionId` | Recent analyses for a session        |
| GET    | `/api/v1/analyses/item/:id`   | Single analysis by id                |

## Local development

```bash
npm install
cp .env.example .env   # fill in GEMINI_API_KEY, and CORS_ORIGIN to your frontend's dev URL
npm run dev             # starts on http://localhost:3000
```

## Deploying to Vercel (as its own project)

1. Push this `backend/` folder as its own Git repository (or as the root of a
   monorepo subfolder — Vercel lets you set the "Root Directory" per project).
2. In Vercel, "Add New Project" → import the repo → set **Root Directory** to
   `backend` if it's a monorepo.
3. Framework preset: **Other**. Vercel auto-detects `api/index.ts` as a serverless
   function; `vercel.json` rewrites `/api/*` to it.
4. Add environment variables in the Vercel dashboard: `GEMINI_API_KEY`,
   `CORS_ORIGIN` (your frontend's production URL, e.g.
   `https://your-frontend.vercel.app`), and optionally `DB_HOST`, `DB_PORT`,
   `DB_NAME`, `DB_USER`, `DB_PASSWORD` if you're using MySQL.
5. Deploy. Your API will be live at `https://your-backend.vercel.app/api/v1/...`.

> Note: Vercel serverless functions are stateless and have a request body size
> limit (~4.5MB by default). The 5MB file-size limit configured in
> `upload.middleware.ts` is close to that ceiling — if you hit `413` errors on
> Vercel, either lower `fileSize` in that middleware or deploy the backend to a
> platform without that limit (Render/Railway/Fly.io), which also works out of
> the box with `npm run build && npm start`.

## Deploying to Render / Railway / a VM instead

```bash
npm install
npm run build   # bundles server.ts -> dist/server.cjs
npm start       # node dist/server.cjs
```

Set the same environment variables from `.env.example` in that platform's
dashboard.

## Environment variables

See `.env.example`. Key ones:

- `GEMINI_API_KEY` — required for real AI analysis (a deterministic
  keyword-based fallback runs automatically if this is missing or Gemini fails).
- `CORS_ORIGIN` — must include your deployed frontend's origin, or requests
  from the browser will be blocked. Comma-separate multiple origins.
- `DB_*` — optional. Without them, analysis history is kept in-memory only
  (per server instance — this does not persist across cold starts on serverless).
