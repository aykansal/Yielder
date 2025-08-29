import { useConnection, useActiveAddress, usePublicKey, usePermissions, useAddresses } from '@arweave-wallet-kit/react';
import { useMemo } from 'react';

interface WalletInfo {
  address: string;
  balance?: string;
  publicKey?: string;
  allAddresses?: string[];
  permissions?: string[];
}

// Custom hook that wraps arweave-wallet-kit hooks
export const useWallet = () => {
  const { connected, connect, disconnect } = useConnection();
  const address = useActiveAddress();
  const publicKey = usePublicKey();
  const permissions = usePermissions();
  const allAddresses = useAddresses();

  const walletInfo: WalletInfo | null = useMemo(() => {
    if (!connected || !address) return null;

    return {
      address,
      publicKey: publicKey || undefined,
      allAddresses: allAddresses || undefined,
      permissions: permissions || undefined,
    };
  }, [connected, address, publicKey, permissions, allAddresses]);

  return {
    isAuthenticated: connected,
    wallet: walletInfo,
    connect,
    disconnect,
  };
};

// Convenience hook for auth state
export const useAuth = () => {
  const { isAuthenticated, wallet } = useWallet();
  return { isAuthenticated, wallet };
};

// Convenience hook for wallet actions
export const useWalletActions = () => {
  const { connect, disconnect } = useWallet();
  return { connectWallet: connect, disconnectWallet: disconnect };
};