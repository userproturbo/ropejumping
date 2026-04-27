# ropejumping

Technical foundation for the ropejumping web platform.

The product concept is preserved in [docs/CONCEPT.md](docs/CONCEPT.md).

## Stack

- Next.js App Router
- TypeScript
- tRPC
- Prisma
- PostgreSQL
- Tailwind CSS
- Auth.js / NextAuth
- ESLint + Prettier
- pnpm
- Import alias: `@/`

## Requirements

- Node.js 20+
- pnpm 10+
- Docker and Docker Compose

## Installation

```bash
pnpm install
```

## Environment Setup

Create a local environment file from the example:

```bash
cp .env.example .env
```

The default local database URL is:

```env
DATABASE_URL="postgresql://ropejumping:ropejumping@localhost:5432/ropejumping"
```

Fill `AUTH_SECRET` and OAuth provider values before using authentication in a real environment.
Yandex Object Storage variables are placeholders only; upload logic is not implemented yet.

Authentication is configured with Auth.js. OAuth providers are enabled only when
their environment variables are present, so the app can still build without real
provider credentials during local foundation work.

The first authenticated feature is the basic profile flow:

- `/profile` shows the current user's profile and requires authentication.
- `/profile/edit` creates or updates the current user's profile.
- `/u/[username]` shows a public profile by username.

The first team feature set is also available:

- `/teams` lists public teams.
- `/teams/new` creates a team and adds the creator as `OWNER`.
- `/teams/my` shows teams where the current user is a member.
- `/teams/[slug]` shows the public team page.
- `/teams/[slug]/settings` lets `OWNER` and `ADMIN` members edit basic team
  details. Team slugs are required during creation and are not editable yet.

## Local Development Sign In

In development, Auth.js enables a credentials-only test provider for local
profile testing. Sign in with:

```text
dev@ropejumping.local
```

This provider is enabled only when `NODE_ENV` is `development`; it is disabled
in production. OAuth provider placeholders remain available for later setup.

## Docker Database

Start PostgreSQL:

```bash
docker compose up -d
```

Check container health:

```bash
docker compose ps
```

Stop PostgreSQL:

```bash
docker compose down
```

## Prisma

Push the schema to the local database:

```bash
pnpm db:push
```

Create and apply a local migration:

```bash
pnpm db:migrate
```

Open Prisma Studio:

```bash
pnpm db:studio
```

## Local Development

```bash
pnpm dev
```

The app runs at http://localhost:3000 by default.
