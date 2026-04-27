export const formatEventDateRange = (
  startsAt: Date,
  endsAt: Date | null,
) => {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  if (!endsAt) {
    return formatter.format(startsAt);
  }

  return `${formatter.format(startsAt)} - ${formatter.format(endsAt)}`;
};

export const toDatetimeLocalValue = (date: Date | string | null) => {
  if (!date) return "";

  const parsedDate = new Date(date);
  const localDate = new Date(
    parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 16);
};

export const datetimeLocalToIso = (value: string) =>
  value ? new Date(value).toISOString() : "";
