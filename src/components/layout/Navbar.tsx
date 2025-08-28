import { NavLink } from "react-router";
import { CopyToClipboard } from "@/components/atoms/CopyToClipboard";
import { shortenAddress } from "@/lib/format";
import { ExternalLink, Wallet, LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth, useWalletActions } from "@/hooks/use-global-state";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

export function Navbar() {
  const { isAuthenticated, wallet, isConnecting } = useAuth();
  const { connectWallet, disconnectWallet } = useWalletActions();

  const tabs = [
    { to: "/pools", label: "Pools" },
    { to: "/dashboard", label: "User Dashboard" },
  ];

  const handleConnect = async () => {
    try {
      await connectWallet();
      toast({
        title: "Wallet Connected",
        description: "Successfully connected to your wallet.",
      });
    } catch (error) {
      toast({
        title: "Connection Failed", 
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    });
  };

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
          <WalletSection 
            isAuthenticated={isAuthenticated}
            wallet={wallet}
            isConnecting={isConnecting}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </div>
    </header>
  );
}

interface WalletSectionProps {
  isAuthenticated: boolean;
  wallet: { address: string; publicKey?: string } | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

function WalletSection({ isAuthenticated, wallet, isConnecting, onConnect, onDisconnect }: WalletSectionProps) {
  if (isAuthenticated && wallet) {
    return (
      <>
        {/* Desktop wallet info */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-xs">
          <span className="text-sm font-medium">
            {shortenAddress(wallet.address)}
          </span>
          <CopyToClipboard value={wallet.address} />
          <a
            aria-label="Open in explorer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[hsl(var(--primary-700))] text-[hsl(var(--primary-700))] transition-colors hover:bg-[hsl(var(--primary))]"
            href={`https://viewblock.io/arweave/address/${wallet.address}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        
        {/* Mobile wallet menu */}
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {shortenAddress(wallet.address)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDisconnect}>
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Desktop disconnect button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onDisconnect}
          className="hidden sm:flex"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </>
    );
  }

  return (
    <Button 
      onClick={onConnect} 
      disabled={isConnecting}
      variant="outline"
      size="sm"
    >
      <Wallet className="mr-2 h-4 w-4" />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
