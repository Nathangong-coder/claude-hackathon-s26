"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/plan", label: "Today" },
  { href: "/check-in", label: "Chat" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg justify-around gap-1 px-2 py-2">
        {items.map(({ href, label }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-12 min-w-[4.5rem] flex-1 items-center justify-center rounded-xl text-base font-semibold transition-colors ${
                active
                  ? "bg-teal-50 text-teal-800"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
