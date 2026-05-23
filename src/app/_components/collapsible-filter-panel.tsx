"use client";

import { useId, useState, type ReactNode } from "react";

type CollapsibleFilterPanelProps = {
  actions?: ReactNode;
  activeCount: number;
  children: ReactNode;
  defaultOpen: boolean;
  header: ReactNode;
};

export function CollapsibleFilterPanel({
  actions,
  activeCount,
  children,
  defaultOpen,
  header,
}: CollapsibleFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>{header}</div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            aria-controls={panelId}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((current) => !current)}
            className="border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-950"
          >
            Фильтры{activeCount > 0 ? `: ${activeCount}` : ""}
          </button>
          {actions}
        </div>
      </div>

      {isOpen ? (
        <section
          id={panelId}
          className="mb-6 border border-zinc-200 bg-white p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-zinc-950">Фильтры</h2>
            {activeCount > 0 ? (
              <span className="text-sm text-zinc-500">
                {activeCount} {getActiveFilterLabel(activeCount)}
              </span>
            ) : null}
          </div>
          {children}
        </section>
      ) : null}
    </>
  );
}

function getActiveFilterLabel(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return "активных";
  }

  if (lastDigit === 1) {
    return "активный";
  }

  return "активных";
}
