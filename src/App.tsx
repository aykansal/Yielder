import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, HashRouter } from "react-router";
import { ThemeProvider } from "@/contexts/ThemeContext";
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

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="yielder-ui-theme">
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  </ThemeProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
