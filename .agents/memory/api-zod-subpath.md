---
name: api-zod sub-path export pattern
description: How api-zod is structured to avoid TS2308 conflicts between Zod schema values and TypeScript interfaces
---

## The Rule
- `@workspace/api-zod` (index) → exports only TypeScript interfaces from `generated/types/`
- `@workspace/api-zod/schemas` → exports only Zod schema values from `generated/api.ts`

## Why
Orval generates both Zod schemas (values) and TypeScript interfaces with the same names. Re-exporting both from the same barrel (`index.ts`) causes TS2308. Splitting into sub-paths eliminates the conflict: the index only has types, the `/schemas` sub-path only has values.

## How to Apply
- **api-server routes**: always import from `@workspace/api-zod/schemas` (e.g. `CreateDocumentBody.parse(...)`)
- **api-client-react** and **frontend**: import from `@workspace/api-zod` for TypeScript types (`import type { Document }`)
- The `lib/api-zod/package.json` exports field exposes both: `"." → ./src/index.ts` and `"./schemas" → ./src/schemas.ts`
- Any new route file must NOT import from `@workspace/api-zod` (the types index) or use `zod/v4` — use `@workspace/api-zod/schemas` instead
