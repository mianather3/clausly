<div align="center">

# Clausly

**AI-powered legal documents for people who can't afford a lawyer.**

Generate attorney-quality NDAs, contractor agreements, privacy policies, and terms of service in seconds — then review any contract for risk with clause-by-clause AI analysis.

</div>

---

## What It Does

Small businesses, freelancers, and founders need legal protection but can't justify $400/hour attorney fees for a contractor agreement. Clausly closes that gap.

| Feature | Description |
|---|---|
| **Document Generation** | NDA, Contractor Agreement, Privacy Policy, Terms of Service — drafted by GPT-4o from your inputs |
| **Contract Review** | Paste any contract and get a 1–10 risk score with every risky clause flagged and explained |
| **AI Clause Explainer** | Click any paragraph in a generated document to get a plain-English breakdown: what it means, why it matters, who it favors |
| **Document Comparison** | Side-by-side AI diff of two contracts with categorized key differences |
| **Send for Signature** | Email a signing link to any recipient — no account required on their end |
| **Share Results** | Generate a public link to any contract review result |
| **Document Templates** | Save form inputs as reusable templates |
| **Admin Dashboard** | Platform-wide usage stats, user activity, document counts |

---

## Tech Stack

```
Frontend          React + Vite + Tailwind CSS + shadcn/ui
Backend           Node.js + Express (ESM, esbuild)
Database          Neon PostgreSQL + Drizzle ORM
Auth              Clerk
AI                OpenAI GPT-4o
Email             Resend
Word Generation   docx (server-side)
PDF Generation    pdf-lib (server-side)
Hosting           Vercel (frontend) + AWS Elastic Beanstalk (backend)
Domain            clausly.net
```

---

## Repository Structure

```
clausly/
├── artifacts/
│   ├── clausly/                  # React frontend (deployed to Vercel)
│   │   ├── src/
│   │   │   ├── pages/            # All page components
│   │   │   ├── components/       # Shared UI components (shadcn/ui)
│   │   │   └── lib/              # API client, utilities
│   │   ├── vercel.json           # API proxy + SPA fallback rewrites
│   │   └── vite.config.ts
│   │
│   └── api-server/               # Express backend (deployed to AWS EB)
│       └── src/
│           ├── routes/
│           │   ├── documents/    # Generation, download, prompts
│           │   ├── reviews/      # Contract analysis
│           │   ├── signatures/   # Send for signature flow
│           │   ├── shared-reviews/
│           │   ├── comparisons/
│           │   ├── templates/
│           │   ├── dashboard/
│           │   └── admin/
│           ├── middlewares/      # Clerk auth
│           └── lib/              # OpenAI client, logger
│
├── clausly-backend/              # AWS EB deployment folder
│   ├── dist/                     # Copied from api-server/dist before deploy
│   ├── package.json
│   └── Procfile
│
└── lib/
    ├── api-client-react/         # Orval-generated React Query hooks
    ├── api-spec/                 # OpenAPI spec (source of truth)
    ├── api-zod/                  # Zod validators and types
    └── db/
        └── src/schema/           # Drizzle schema (7 tables)
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `documents` | Generated legal documents with content and metadata |
| `reviews` | Contract risk analyses with scores and flagged clauses |
| `signature_requests` | Signature flow state — tokens, status, timestamps |
| `shared_reviews` | Public share tokens for review results |
| `comparisons` | Side-by-side contract comparison results |
| `templates` | Saved document generation form inputs |
| `playing_with_neon` | Neon sample table — kept to prevent accidental drizzle deletion |

---

## Local Development

**Prerequisites:** Node.js 18+, pnpm, a Neon database, Clerk account, OpenAI API key

```bash
# Clone
git clone https://github.com/mianather3/clausly.git
cd clausly

# Install dependencies
pnpm install

# Set environment variables
# Frontend: artifacts/clausly/.env.local
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Backend: artifacts/api-server/.env
NEON_DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com
PORT=8080

# Push DB schema
cd lib/db
NEON_DATABASE_URL="your_url" pnpm run push

# Run frontend
cd artifacts/clausly
pnpm dev

# Run backend (separate terminal)
cd artifacts/api-server
pnpm dev
```

---

## Deployment

### Frontend → Vercel

Every push to `main` automatically deploys via GitHub integration.

For manual deploys:
```bash
cd artifacts/clausly
npx vite build
cp vercel.json dist/public/vercel.json   # critical — must copy every time
cd dist/public
vercel --prod
```

### Backend → AWS Elastic Beanstalk

```bash
cd artifacts/api-server
node build.mjs

cd clausly-backend
cp -r ../artifacts/api-server/dist .
eb deploy
```

### Database Migrations

```bash
cd lib/db
NEON_DATABASE_URL="your_url" pnpm run push
# When prompted: always choose "create table", never "rename"
# If playing_with_neon deletion warning appears: abort and check schema/index.ts
```

---

## Environment Variables (AWS EB)

| Variable | Description |
|---|---|
| `PORT` | `8080` |
| `NODE_ENV` | `production` |
| `NEON_DATABASE_URL` | Neon PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk backend secret key |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `OPENAI_API_KEY` | OpenAI API key |
| `RESEND_API_KEY` | Resend email API key |
| `FROM_EMAIL` | `noreply@clausly.net` |
| `APP_URL` | `https://clausly.net` |

---

## Architecture Notes

**Why Vercel + AWS EB instead of one platform?**
The frontend is a static React SPA — Vercel's edge network is the right tool. The backend is a long-running Express server with heavy GPT-4o calls and file generation — Elastic Beanstalk gives full control over the Node runtime without cold start penalties.

**API proxying via Vercel rewrites**
All `/api/*` calls from the frontend are proxied server-side through Vercel to the EB backend. This avoids mixed-content browser blocking (HTTPS frontend → HTTP backend) without needing to set up SSL on the EC2 instance directly.

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "http://[eb-url]/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Monorepo workspace**
Shared packages (`db`, `api-zod`, `api-client-react`) are consumed by both frontend and backend via pnpm workspace links. The EB deployment folder (`clausly-backend/`) uses a clean `package.json` with no workspace references to avoid deployment issues.


---

## Legal Disclaimer

Clausly generates documents for informational purposes only. Nothing on this platform constitutes legal advice or creates an attorney-client relationship. Always consult a licensed attorney before executing any legal document.

---

<div align="center">

Built by [Mian Ather Ali](https://github.com/mianather3) · University of Utah Honors College · CS/DS '27

[clausly.net](https://clausly.net) · [Pricing](https://clausly.net/pricing)

</div>
