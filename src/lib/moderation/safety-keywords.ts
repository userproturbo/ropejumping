export const moderationSafetyKeywords = [
  "координат",
  "координаты",
  "креплен",
  "крепления",
  "точки",
  "маршрут",
  "доступ",
  "схема",
  "инструкция",
  "самостоятель",
  "опасн",
] as const;

export const hasModerationSafetyKeyword = (...values: Array<string | null>) => {
  const text = values
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase("ru-RU");

  return moderationSafetyKeywords.some((keyword) => text.includes(keyword));
};
