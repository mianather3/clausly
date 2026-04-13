# Clausly — AI Legal Document Platform

## Overview

Full-stack AI-powered legal document platform. Users can generate legal documents (NDA, Privacy Policy, Contractor Agreement, Terms of Service) and review contracts for risk analysis using OpenAI GPT-4o.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifact: clausly at `/`)
- **API framework**: Express 5 (artifact: api-server at `/api`)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Clerk (email/password)
- **AI**: OpenAI GPT-4o via OPENAI_API_KEY
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Database Schema

- **documents** table: userId, documentType, title, partyA, partyB, content, metadata
- **reviews** table: userId, title, contractText, riskScore, riskyClausesJson, summaryJson

## Key Files

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle schema (documents.ts, reviews.ts)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/openai.ts` — OpenAI client
- `artifacts/clausly/src/pages/` — React pages
- `artifacts/clausly/src/components/AppLayout.tsx` — App sidebar layout

## Features

1. **Landing page** — headline, feature list, CTA
2. **Auth** — Clerk email/password signup and login
3. **Document Generator** — pick document type, fill intake form, AI generates full legal doc
4. **Contract Review** — paste contract text, AI returns risky clauses, suggestions, risk score 1-10
5. **Dashboard** — stats cards, recent documents and reviews
6. **Document/Review History** — list pages with delete, detail pages with copy/download

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Environment Variables

- `OPENAI_API_KEY` — OpenAI API key (user provided)
- `CLERK_SECRET_KEY` — Clerk server secret (auto-provisioned)
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key (auto-provisioned)
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk key for frontend (auto-provisioned)
- `NEON_DATABASE_URL` — Neon.tech PostgreSQL connection string (persistent, survives redeployments)
- `DATABASE_URL` — Replit built-in PostgreSQL (fallback, not used in production)
