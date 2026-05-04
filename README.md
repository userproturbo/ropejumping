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
Yandex Object Storage variables may stay empty for local builds, but image uploads
require configured storage.

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
- Владельцы и администраторы могут управлять участниками на
  `/teams/[slug]/members`: добавлять пользователей по username, менять роли
  `ADMIN`, `ORGANIZER` и `MEMBER`, а также удалять участников. Роль владельца
  защищена от изменения и удаления; приглашения пока не реализованы.
- Пользователи с заполненным профилем могут подать заявку на вступление в
  публичную команду. Владельцы и администраторы рассматривают заявки на
  `/teams/[slug]/join-requests`: принятие заявки добавляет пользователя в
  команду с ролью доступа `MEMBER`, отклонение не меняет состав команды.
- Роли доступа (`OWNER`, `ADMIN`, `ORGANIZER`, `MEMBER`) отделены от функций в
  команде (`OPERATOR`, `PHOTOGRAPHER`, `MEDIC`, `INSTRUCTOR`, `COORDINATOR`,
  `RADIO_OPERATOR`). Функции показывают роль человека в работе команды и не
  дают дополнительных прав.

Базовые мероприятия:

- `/events` показывает публичные мероприятия.
- `/events/new` создает мероприятие для команды, где текущий пользователь имеет
  роль `OWNER`, `ADMIN` или `ORGANIZER`.
- `/events/my` показывает мероприятия, созданные текущим пользователем или
  доступные ему для управления через роль в команде.
- `/events/[slug]` показывает публичную страницу мероприятия.
- `/events/[slug]/edit` позволяет автору мероприятия или участникам команды с
  ролью `OWNER`, `ADMIN` или `ORGANIZER` редактировать базовые данные
  мероприятия. Slug мероприятия задается при создании и пока не редактируется.
- Организаторы могут управлять статусом мероприятия отдельно от основной формы:
  открывать и закрывать приём заявок, отмечать отсутствие мест, перенос,
  отмену или архив. Заявки принимаются только для статусов `PUBLISHED` и
  `APPLICATIONS_OPEN`; завершение мероприятия остается отдельным flow через
  `/events/[slug]/complete`.

Заявки на мероприятия:

- Участник может подать заявку на публичное мероприятие, если прием заявок
  доступен.
- `/applications/my` показывает заявки текущего пользователя.
- `/events/[slug]/applications` позволяет автору мероприятия или участникам
  команды с ролью `OWNER`, `ADMIN` или `ORGANIZER` принимать и отклонять заявки.
- Уведомления и бейджи пока не реализованы.

Завершение мероприятий и история участия:

- `/events/[slug]/complete` позволяет автору мероприятия или участникам команды
  с ролью `OWNER`, `ADMIN` или `ORGANIZER` завершить мероприятие и подтвердить
  фактических участников.
- После завершения создаются записи участия, а заявки получают статусы
  `CONFIRMED_PARTICIPATION` или `NO_SHOW`.
- Подтвержденные участия отображаются в личном и публичном профиле.
- Автоматические бейджи начисляются по подтвержденной истории участия:
  количеству участий, уникальным объектам и максимальной высоте связанного
  объекта. Бейджи не являются рейтингом; лидерборда нет.
- Уведомления и лента пока не реализованы.

Каталог объектов:

- `/objects` показывает публичный каталог объектов.
- `/objects/new` позволяет пользователю с заполненным профилем добавить объект.
- `/objects/my` показывает объекты, добавленные текущим пользователем.
- `/objects/[slug]` показывает публичную страницу объекта и связанные публичные
  мероприятия.
- `/objects/[slug]/edit` позволяет автору редактировать безопасное общее
  описание объекта. В каталоге нельзя публиковать точные координаты, способы
  доступа, точки крепления, технические детали и инструкции для самостоятельных
  прыжков.

Минимальная лента:

- `/feed` показывает простую хронологическую ленту публикаций.
- `/feed/new` позволяет пользователю с заполненным профилем создать пост с
  текстом, загруженным изображением или ссылкой на изображение и необязательной
  связью с командой, мероприятием или объектом.
- `/posts/[id]` показывает пост, комментарии и лайки.
- Алгоритмической ленты, галерей, видео, репостов, уведомлений и чата пока нет.

Загрузка изображений:

- Загрузки используют Yandex Object Storage через presigned `PUT` URL.
- Для загрузок нужны переменные `YANDEX_OBJECT_STORAGE_ENDPOINT`,
  `YANDEX_OBJECT_STORAGE_REGION`, `YANDEX_OBJECT_STORAGE_BUCKET`,
  `YANDEX_OBJECT_STORAGE_ACCESS_KEY_ID`,
  `YANDEX_OBJECT_STORAGE_SECRET_ACCESS_KEY` и
  `YANDEX_OBJECT_STORAGE_PUBLIC_URL`.
- Сейчас поддерживаются только изображения JPEG, PNG, WebP и GIF размером до
  10 МБ.
- Пост хранит публичную ссылку на изображение в `Post.imageUrl`.
- `Media` хранит метаданные загруженного файла: владельца, bucket, key,
  публичный URL, MIME-тип и размер.

Модерация ленты:

- Пользователи с профилем могут отправлять жалобы на посты и комментарии.
- Модераторы задаются переменной `MODERATOR_EMAILS` со списком email через
  запятую.
- `/moderation` показывает открытые жалобы, `/moderation/reviewed` —
  рассмотренные.
- Скрытие контента использует `hiddenAt`; посты и комментарии не удаляются.

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
