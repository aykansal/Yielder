import { NavLink, useNavigate } from "react-router";
import { CopyToClipboard } from "@/components/atoms/CopyToClipboard";
import { shortenAddress } from "@/lib/format";
import { ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Navbar() {
  const wallet = "g20B3k9F1d8s9e2p0uJaU";

  const tabs = [
    { to: "/pools", label: "Pools" },
    { to: "/dashboard", label: "User Dashboard" },
  ];

  return (
    <header className="sticky top-0 z-40 h-[72px] w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        <div className="text-xl font-extrabold tracking-tight text-foreground">
          Yielder
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `relative text-sm font-medium text-foreground/80 hover:text-foreground transition-colors ${isActive ? "text-foreground" : ""}`
              }
            >
              {({ isActive }) => (
                <span className="inline-flex flex-col items-center">
                  <span>{t.label}</span>
                  <span
                    className={`mt-1 h-0.5 w-8 rounded-full transition-all ${
                      isActive
                        ? "bg-[hsl(var(--primary-700))]"
                        : "bg-transparent"
                    }`}
                  />
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-xs">
            <span className="text-sm font-medium">
              {shortenAddress(wallet)}
            </span>
            <CopyToClipboard value={wallet} />
            <a
              aria-label="Open in explorer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[hsl(var(--primary-700))] text-[hsl(var(--primary-700))] transition-colors hover:bg-[hsl(var(--primary))]"
              href={`https://explorer.example.com/${wallet}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
