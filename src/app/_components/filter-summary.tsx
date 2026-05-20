import Link from "next/link";

export type FilterChip = {
  label: string;
  value: string;
};

type FilterSummaryProps = {
  chips: FilterChip[];
  resetHref: string;
  resultCount: number;
  resultLabel?: string;
};

export function FilterSummary({
  chips,
  resetHref,
  resultCount,
  resultLabel = "Найдено",
}: FilterSummaryProps) {
  return (
    <div className="mb-6 border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-zinc-950">
          {resultLabel}: {resultCount}
        </p>
        {chips.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={`${chip.label}:${chip.value}`}
                  className="border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
                >
                  {chip.label}: {chip.value}
                </span>
              ))}
            </div>
            <Link
              href={resetHref}
              className="text-sm text-zinc-600 hover:text-zinc-950"
            >
              Сбросить всё
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
