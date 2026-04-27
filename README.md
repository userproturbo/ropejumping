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

Базовый профиль участника:

- `/profile` показывает профиль текущего пользователя и требует входа.
- `/profile/edit` создает или обновляет профиль текущего пользователя.
- `/u/[username]` показывает публичный профиль по имени пользователя.

Базовые команды:

- `/teams` показывает публичные команды.
- `/teams/new` создает команду и добавляет автора как `OWNER`.
- `/teams/my` показывает команды, в которых состоит текущий пользователь.
- `/teams/[slug]` показывает публичную страницу команды.
- `/teams/[slug]/settings` позволяет участникам с ролью `OWNER` и `ADMIN`
  редактировать базовые данные команды. Slug команды задается при создании и
  пока не редактируется.

Базовые мероприятия доступны без заявок:

- `/events` показывает публичные мероприятия.
- `/events/new` создает мероприятие для команды, где текущий пользователь имеет
  роль `OWNER`, `ADMIN` или `ORGANIZER`.
- `/events/my` показывает мероприятия, созданные текущим пользователем или
  доступные ему для управления через роль в команде.
- `/events/[slug]` показывает публичную страницу мероприятия.
- `/events/[slug]/edit` позволяет автору мероприятия или участникам команды с
  ролью `OWNER`, `ADMIN` или `ORGANIZER` редактировать базовые данные
  мероприятия. Slug мероприятия задается при создании и пока не редактируется.

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
