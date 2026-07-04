"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";

type MobileMenuLink = {
  href: string;
  iconSrc?: string;
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
        className="flex items-center rounded-full focus:ring-2 focus:ring-[var(--rp-text)] focus:ring-offset-2 focus:ring-offset-[var(--rp-bg-soft)] focus:outline-none"
      >
        <span className="sr-only">Открыть меню</span>
        {trigger}
      </button>

      {isOpen ? (
        <div
          id={menuId}
          className="theme-surface-transition absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-[var(--rp-border)] bg-[var(--rp-bg-soft)] px-6 py-4 shadow-lg shadow-black/30"
        >
          <nav className="grid gap-4" aria-label="Мобильная навигация">
            {sections.map((section) => (
              <div key={section.label}>
                <p className="px-1 text-xs font-medium text-[var(--rp-text-muted)]">
                  {section.label}
                </p>
                <div className="mt-1 grid gap-1">
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="group flex min-w-0 items-center gap-3 px-1 py-2 text-base text-[var(--rp-text-soft)] hover:text-[var(--rp-text)]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                        {link.iconSrc ? (
                          <Image
                            src={link.iconSrc}
                            alt=""
                            aria-hidden="true"
                            width={24}
                            height={24}
                            className="app-menu-icon h-[22px] w-[22px] opacity-95 transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0 truncate">{link.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-3 grid gap-3 border-t border-[var(--rp-border)] pt-3">
            {authAction}
          </div>
        </div>
      ) : null}
    </div>
  );
}
