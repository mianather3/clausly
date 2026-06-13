---
name: api-client-react queryKey requirement
description: Orval v8 react-query hooks require queryKey in the query options
---

## The Rule
When passing `query` options to an Orval-generated hook (e.g. `useGetDocument`, `useGetReview`), always include `queryKey` alongside `enabled`.

## Why
Orval v8.5.3 generates `UseQueryOptions` types that include `queryKey` as a required field when used with React Query v5. Omitting it causes TS2741.

## How to Apply
```ts
// WRONG
useGetDocument(id, { query: { enabled: !!id } });

// CORRECT
import { useGetDocument, getGetDocumentQueryKey } from "@workspace/api-client-react";
useGetDocument(id, { query: { enabled: !!id, queryKey: getGetDocumentQueryKey(id) } });
```
Each entity has a corresponding `getGet<X>QueryKey(id)` helper exported from `@workspace/api-client-react`.
