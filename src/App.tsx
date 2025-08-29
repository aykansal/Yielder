import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, HashRouter } from "react-router";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { AppShell } from "@/components/layout/AppShell";
import NotFound from "./pages/NotFound";
import Pools from "./pages/Pools";
import Dashboard from "./pages/Dashboard";
import {
  LiquidityAdd,
  LiquidityRemove,
  LiquidityClaim,
  LiquidityRedirect,
} from "./pages/Liquidity";
import { ArweaveWalletKit } from "@arweave-wallet-kit/react";
import WanderStrategy from "@arweave-wallet-kit/wander-strategy";
import OthentStrategy from "@arweave-wallet-kit/othent-strategy";
import BrowserWalletStrategy from "@arweave-wallet-kit/browser-wallet-strategy";
import WebWalletStrategy from "@arweave-wallet-kit/webwallet-strategy";
import { useMemo } from "react";

const queryClient = new QueryClient();

// ArweaveWalletKit wrapper component that syncs with theme
const ThemedArweaveWalletKit = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme();

  // Get computed theme (resolves "system" to actual theme)
  const computedTheme = useMemo(() => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  }, [theme]);

  // Get CSS custom property values
  const getThemeColors = useMemo(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    const primaryColor = computedStyle.getPropertyValue('--primary').trim();
    const primaryHsl = primaryColor.match(/(\d+) (\d+)% (\d+)%/);

    if (primaryHsl) {
      const [h, s, l] = primaryHsl.slice(1).map(Number);
      // Convert HSL to RGB (approximate)
      const c = (1 - Math.abs(2 * l / 100 - 1)) * (s / 100);
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = l / 100 - c / 2;

      let r = 0, g = 0, b = 0;

      if (0 <= h && h < 60) { r = c; g = x; b = 0; }
      else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
      else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
      else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
      else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
      else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

      r = Math.round((r + m) * 255);
      g = Math.round((g + m) * 255);
      b = Math.round((b + m) * 255);

      return {
        accent: { r, g, b },
        titleHighlight: { r, g, b },
      };
    }

    // Fallback colors
    return {
      accent: { r: 168, g: 85, b: 247 }, // Purple accent
      titleHighlight: { r: 168, g: 85, b: 247 },
    };
  }, [computedTheme]);

  return (
    <ArweaveWalletKit
      theme={{
        displayTheme: computedTheme,
        ...getThemeColors,
        radius: "default",
      }}
      config={{
        strategies: [
          new WanderStrategy(),
          // new WebWalletStrategy(),
          // new OthentStrategy(),
          // new BrowserWalletStrategy(),
        ],
        permissions: ["ACCESS_ADDRESS", "ACCESS_ALL_ADDRESSES", "ACCESS_PUBLIC_KEY", "ACCESS_ARWEAVE_CONFIG"],
        ensurePermissions: true,
        appInfo: {
          name: "Yielder",
          logo: "https://arweave.net/tQUcL4wlNj_NED2VjUGUhfCTJ6pDN9P0e3CbnHo3vUE",
        },
        gatewayConfig: {
          host: "arweave.net",
          port: 443,
          protocol: "https",
        },
      }}
    >
      {children}
    </ArweaveWalletKit>
  );
};

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="yielder-ui-theme">
    <QueryClientProvider client={queryClient}>
      <ThemedArweaveWalletKit>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <AppShell>
              <Routes>
                <Route path="/" element={<Navigate to="/pools" replace />} />
                <Route path="/pools" element={<Pools />} />
                <Route path="/liquidity" element={<LiquidityRedirect />} />
                <Route
                  path="/liquidity/add/:processId"
                  element={<LiquidityAdd />}
                />
                <Route
                  path="/liquidity/remove/:processId"
                  element={<LiquidityRemove />}
                />
                <Route
                  path="/liquidity/claim/:processId"
                  element={<LiquidityClaim />}
                />
                <Route path="/dashboard" element={<Dashboard />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppShell>
          </HashRouter>
        </TooltipProvider>
      </ThemedArweaveWalletKit>
    </QueryClientProvider>
  </ThemeProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
