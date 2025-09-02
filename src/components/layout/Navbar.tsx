import { Link, NavLink } from "react-router";
import { shortenAddress } from "@/lib/helpers.utils";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth, useWalletActions } from "@/hooks/use-global-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { ConnectButton, useProfileModal } from "@arweave-wallet-kit/react";

export function Navbar() {
  const { isAuthenticated, wallet } = useAuth();
  const { disconnectWallet } = useWalletActions();
  const profileModal = useProfileModal();

  const tabs = [
    { to: "/pools", label: "Pools", public: true },
    { to: "/dashboard", label: "User Dashboard", public: false },
  ];

  const handleDisconnect = () => {
    disconnectWallet();
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    });
  };

  const handleProfileClick = () => {
    profileModal.setOpen(true);
  };

  return (
    <header className="sticky top-0 z-40 h-[72px] w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        <div className="text-xl font-extrabold tracking-tight text-foreground">
          <Link to="/">Yielder</Link>
        </div>

        <nav className="hidden md:flex items-center gap-8">
          <NavLink
            key={tabs[0].to}
            to={tabs[0].to}
            className={({ isActive }) =>
              `relative text-sm font-medium text-foreground/80 hover:text-foreground transition-colors ${isActive ? "text-foreground" : ""}`
            }
          >
            {({ isActive }) => (
              <span className="inline-flex flex-col items-center">
                <span>{tabs[0].label}</span>
                <span
                  className={`mt-1 h-0.5 w-8 rounded-full transition-all ${
                    isActive ? "bg-[hsl(var(--primary-700))]" : "bg-transparent"
                  }`}
                />
              </span>
            )}
          </NavLink>
          {isAuthenticated && (
            <NavLink
              key={tabs[1].to}
              to={tabs[1].to}
              className={({ isActive }) =>
                `relative text-sm font-medium text-foreground/80 hover:text-foreground transition-colors ${isActive ? "text-foreground" : ""}`
              }
            >
              {({ isActive }) => (
                <span className="inline-flex flex-col items-center">
                  <span>{tabs[1].label}</span>
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
          )}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <WalletSection
            isAuthenticated={isAuthenticated}
            wallet={wallet}
            onDisconnect={handleDisconnect}
            onProfileClick={handleProfileClick}
          />
        </div>
      </div>
    </header>
  );
}

interface WalletSectionProps {
  isAuthenticated: boolean;
  wallet: { address: string; publicKey?: string } | null;
  onDisconnect: () => void;
  onProfileClick: () => void;
}

function WalletSection({
  isAuthenticated,
  wallet,
  onDisconnect,
  onProfileClick,
}: WalletSectionProps) {
  if (isAuthenticated && wallet) {
    return (
      <>
        {/* Desktop wallet info */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-xs">
          <span className="text-sm font-medium">
            {shortenAddress(wallet.address)}
          </span>
          <Button
            variant="outline"
            aria-label="Open in explorer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[hsl(var(--primary-700))] text-[hsl(var(--primary-700))] transition-colors hover:bg-[hsl(var(--primary))]"
            onClick={() =>
              window.open(
                `https://viewblock.io/arweave/address/${wallet.address}`,
                "_blank",
              )
            }
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
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
              <DropdownMenuItem
                disabled
                className="text-xs text-muted-foreground"
              >
                {shortenAddress(wallet.address)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDisconnect}>
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop profile button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onProfileClick}
          className="hidden sm:flex"
        >
          Profile
        </Button>
      </>
    );
  }

  return <ConnectButton />;
}
