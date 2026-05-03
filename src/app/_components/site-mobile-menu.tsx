"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

type HeaderLink = {
  href: string;
  label: string;
};

type SiteMobileMenuProps = {
  authAction: ReactNode;
  links: HeaderLink[];
};

export function SiteMobileMenu({ authAction, links }: SiteMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = "site-mobile-menu";

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-controls={menuId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-950 hover:text-zinc-950"
      >
        Меню
      </button>

      {isOpen ? (
        <div
          id={menuId}
          className="absolute inset-x-0 top-full border-b border-zinc-200 bg-white px-6 py-4 shadow-sm"
        >
          <nav className="grid gap-1" aria-label="Мобильная навигация">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="px-1 py-2 text-sm text-zinc-700 hover:text-zinc-950"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 border-t border-zinc-200 pt-3">
            {authAction}
          </div>
        </div>
      ) : null}
    </div>
  );
}
