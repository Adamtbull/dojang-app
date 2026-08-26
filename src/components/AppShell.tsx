import { NavLink, Outlet } from "react-router-dom";
import { cn } from "../lib/cn";

const NAV = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/upload", label: "Upload", icon: UploadIcon },
  { to: "/library", label: "Library", icon: LibraryIcon },
  { to: "/guide", label: "Guide", icon: GuideIcon },
  { to: "/export", label: "Export", icon: ExportIcon },
];

export function AppShell() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-navy">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-navy-line/60 bg-navy/90 px-4 py-3 backdrop-blur-md">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="font-display text-3xl leading-none text-ink">DOJANG</span>
          <span className="rounded-full bg-dojang-red px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white">
            도장
          </span>
        </NavLink>
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted">On-device</span>
      </header>
      <main className="safe-bottom px-4 pt-4">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-lg -translate-x-1/2 border-t border-navy-line/70 bg-[#0d1530]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
        <ul className="grid grid-cols-5 gap-1">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[11px] font-medium",
                    isActive ? "bg-navy-lift text-white" : "text-muted",
                  )
                }
              >
                <item.icon />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 16V5M7 9l5-5 5 5M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LibraryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 5h6v14H5zM13 9h6v10h-6z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function GuideIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function ExportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v10M8 9l4-4 4 4M5 19h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
