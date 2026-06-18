"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

type MobileMenuLink = {
  href: string;
  label: string;
};

export type MobileMenuSection = {
  label: string;
  links: MobileMenuLink[];
};

type SiteMobileMenuProps = {
  authAction: ReactNode;
  sections: MobileMenuSection[];
  trigger: ReactNode;
};

export function SiteMobileMenu({
  authAction,
  sections,
  trigger,
}: SiteMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = "site-mobile-menu";

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex items-center rounded-full focus:ring-2 focus:ring-[var(--app-text)] focus:ring-offset-2 focus:ring-offset-[var(--app-bg)] focus:outline-none"
      >
        <span className="sr-only">Открыть меню</span>
        {trigger}
      </button>

      {isOpen ? (
        <div
          id={menuId}
          className="absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-[var(--app-border)] bg-[var(--app-bg)] px-6 py-4 shadow-lg shadow-black/30"
        >
          <nav className="grid gap-4" aria-label="Мобильная навигация">
            {sections.map((section) => (
              <div key={section.label}>
                <p className="px-1 text-xs font-medium text-[var(--app-text-muted)]">
                  {section.label}
                </p>
                <div className="mt-1 grid gap-1">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="px-1 py-2 text-sm text-[var(--app-text-secondary)] hover:text-[var(--app-text)]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-3 grid gap-3 border-t border-[var(--app-border)] pt-3">
            {authAction}
          </div>
        </div>
      ) : null}
    </div>
  );
}
