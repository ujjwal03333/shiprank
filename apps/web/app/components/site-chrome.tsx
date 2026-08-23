"use client";

import { usePathname } from "next/navigation";
import { SiteNav } from "./site-nav";
import { SiteFooter } from "./site-footer";
import { PageLoadingBar } from "./page-loading-bar";
import { CommandPalette } from "./command-palette";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const bare = path === "/s" || path.startsWith("/s/");

  if (bare) {
    return (
      <main id="main-content" className="night-court min-h-dvh min-w-0">
        {children}
      </main>
    );
  }

  return (
    <>
      <PageLoadingBar />
      <CommandPalette />
      <SiteNav />
      <main id="main-content" className="min-w-0 flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
