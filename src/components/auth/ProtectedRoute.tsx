import { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-global-state';
import { ConnectButton } from '@arweave-wallet-kit/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ShieldCheck } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  showCard?: boolean;
}

export function ProtectedRoute({ children, fallback, showCard = true }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return fallback || (showCard ? <WalletConnectionCard /> : <WalletConnectionInline />);
  }

  return <>{children}</>;
}

function WalletConnectionCard() {
  return (
    <div className="flex items-center justify-center min-h-[500px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
          <CardDescription className="text-base">
            Connect your wallet to interact with pools, make transactions, and access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>Secure connection via ArConnect</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>No personal data stored</span>
            </div>
          </div>
          <div className="flex justify-center">
            <ConnectButton
              profileModal={true}
              showBalance={false}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            You can browse pools without connecting, but a wallet is required for transactions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function WalletConnectionInline() {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg bg-muted/30">
      <Wallet className="h-8 w-8 text-muted-foreground mb-3" />
      <h3 className="font-semibold mb-2">Wallet Required</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Connect your wallet to access this feature
      </p>
      <div className="flex justify-center">
        <ConnectButton
          profileModal={true}
          showBalance={false}
        />
      </div>
    </div>
  );
}

// Higher-order component for protecting entire pages
export function withWalletAuth<T extends Record<string, any>>(
  Component: React.ComponentType<T>
) {
  return function ProtectedComponent(props: T) {
    return (
      <ProtectedRoute>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
