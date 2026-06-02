---
name: Express 5 params typing
description: req.params values typed as string | string[] in Express 5, require explicit cast
---

In Express 5, `req.params` is typed as `Record<string, string | string[]>`.

**Rule:** Always cast route params with `as string` before use:
```ts
const token = req.params.token as string;
const id = parseInt(req.params.id as string, 10);
```

**Why:** Destructuring (`const { token } = req.params`) gives `string | string[]`, which fails type checks with drizzle-orm `eq()` and `parseInt()`.

**How to apply:** Any new route handler that reads from `req.params` — add `as string` cast immediately on extraction.
