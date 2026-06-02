---
name: DB push interactive workaround
description: drizzle-kit push blocks on TTY confirmation prompts; workaround with direct SQL
---

`pnpm --filter @workspace/db run push` (and even `--force`) still prompts interactively for new tables, which blocks in CI/non-TTY shells.

**Rule:** When adding new tables, create them directly via SQL using the pg Pool from `lib/db/node_modules/pg`:

```js
node -e "
const { Pool } = require('./lib/db/node_modules/pg');
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query('CREATE TABLE IF NOT EXISTS ...').then(() => { console.log('OK'); pool.end(); });
"
```

**Why:** The interactive prompts ask "created or renamed from another table?" — piping `\n` doesn't reliably select the right option.

**How to apply:** Use `CREATE TABLE IF NOT EXISTS` (idempotent) so it's safe to run multiple times. Use for new table creation; schema already has `run push-force` command for non-interactive scenarios.
