import Link from "next/link";

export type FilterChip = {
  label: string;
  value: string;
};

type FilterSummaryProps = {
  chips: FilterChip[];
  resetHref: string;
  resultCount?: number;
  resultLabel?: string;
};

export function FilterSummary({
  chips,
  resetHref,
  resultCount,
  resultLabel = "Найдено",
}: FilterSummaryProps) {
  if (chips.length === 0 && resultCount === undefined) return null;

  return (
    <div className="mb-6 border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        {resultCount !== undefined ? (
          <p className="text-sm font-medium text-[var(--app-text)]">
            {resultLabel}: {resultCount}
          </p>
        ) : null}
        {chips.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={`${chip.label}:${chip.value}`}
                  className="border border-[var(--app-border)] px-2 py-1 text-xs text-[var(--app-text-secondary)]"
                >
                  {chip.label}: {chip.value}
                </span>
              ))}
            </div>
            <Link
              href={resetHref}
              className="text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text)]"
            >
              Сбросить всё
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
