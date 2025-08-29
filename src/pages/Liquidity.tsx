import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { withWalletAuth } from "@/components/auth/ProtectedRoute";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  LiquidityAddComponent, 
  LiquidityRemoveComponent, 
  LiquidityClaimComponent 
} from "@/components/liquidity";

function LiquidityTabs({ processId }: { processId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active tab based on current route
  const activeTab = useMemo(() => {
    if (location.pathname.includes("/add/")) return "add";
    if (location.pathname.includes("/remove/")) return "remove";
    if (location.pathname.includes("/claim/")) return "claim";
    return "add";
  }, [location.pathname]);

  const handleTabChange = (value: string) => {
    navigate(`/liquidity/${value}/${processId}`);
  };

  return (
    <div className="mt-4">
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add">Add</TabsTrigger>
          <TabsTrigger value="remove">Remove</TabsTrigger>
          <TabsTrigger value="claim">Claim</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

// Add Liquidity Route
export const LiquidityAdd = withWalletAuth(() => {
  return <LiquidityAddComponent LiquidityTabs={LiquidityTabs} />;
});

// Remove Liquidity Route  
export const LiquidityRemove = withWalletAuth(() => {
  return <LiquidityRemoveComponent LiquidityTabs={LiquidityTabs} />;
});

// Claim Rewards Route
export const LiquidityClaim = withWalletAuth(() => {
  return <LiquidityClaimComponent LiquidityTabs={LiquidityTabs} />;
});

// Redirect component for legacy URLs
export function LiquidityRedirect() {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const processId = params.get("processId");
    const to = params.get("to");
    if (processId && to) {
      const safeTo =
        to === "add" || to === "remove" || to === "claim" ? to : "add";
      nav(`/liquidity/${safeTo}/${processId}`, { replace: true });
    }
  }, [loc.search, nav]);
  return (
    <div>
      <div className="rounded-[16px] border bg-secondary p-8 text-center text-muted-foreground">
        Redirecting…
      </div>
    </div>
  );
}
