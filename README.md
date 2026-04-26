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
