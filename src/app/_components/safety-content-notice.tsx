export type SafetyContentNoticeVariant =
  | "public"
  | "event"
  | "object"
  | "post"
  | "logistics";

type SafetyContentNoticeProps = {
  variant?: SafetyContentNoticeVariant;
};

const noticeTextByVariant: Record<SafetyContentNoticeVariant, string> = {
  public:
    "Не публикуйте точные координаты объекта, точки крепления, маршруты доступа, технические детали организации прыжков, инструкции для самостоятельных прыжков и приватные детали логистики в публичных постах. Такая информация должна оставаться внутри команды организаторов.",
  event:
    "Публичное описание мероприятия не должно содержать точные координаты, точки крепления, маршруты доступа, технические детали и инструкции для самостоятельных прыжков.",
  object:
    "В карточке объекта не публикуйте точные координаты, точки крепления, маршруты доступа, технические детали и инструкции для самостоятельных прыжков.",
  post: "Посты видны другим участникам. Не публикуйте координаты объектов, точки крепления, маршруты доступа и технические инструкции.",
  logistics:
    "Не публикуйте точные координаты объекта, точки крепления, маршруты доступа и технические детали. Для договорённостей используйте общие ориентиры и чат мероприятия.",
};

export function SafetyContentNotice({
  variant = "public",
}: SafetyContentNoticeProps) {
  return (
    <aside className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      <p className="font-medium text-amber-950">Важно про безопасность</p>
      <p className="mt-1">{noticeTextByVariant[variant]}</p>
    </aside>
  );
}
