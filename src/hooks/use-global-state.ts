import { HOST_NAME, PORT_NUM, PROTOCOL_TYPE } from '@/lib/constants/arkit.constants';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletInfo {
  address: string;
  balance?: string;
  publicKey?: string;
}

interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  isConnecting: boolean;
  wallet: WalletInfo | null;

  // Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  setWalletInfo: (wallet: WalletInfo) => void;
  setConnecting: (connecting: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      isConnecting: false,
      wallet: null,

      // Connect wallet action
      connectWallet: async () => {
        set({ isConnecting: true });

        try {
          // Check if browser extension exists
          if (!window.arweaveWallet) {
            throw new Error('Please install ArConnect wallet extension');
          }

          // Request connection
          await window.arweaveWallet.connect(["ENCRYPT", "DECRYPT", "DISPATCH", "SIGNATURE", "ACCESS_ADDRESS", "SIGN_TRANSACTION", "ACCESS_PUBLIC_KEY", "ACCESS_ALL_ADDRESSES", "ACCESS_ARWEAVE_CONFIG",
            // @ts-expect-error ignore
            "ACCESS_TOKENS",
          ],
            {
              name: "Yielder-Dev",
              logo: "https://arweave.net/pYIMnXpJRFUwTzogx_z5HCOPRRjCbSPYIlUqOjJ9Srs",
            },
            {
              host: HOST_NAME,
              port: PORT_NUM,
              protocol: PROTOCOL_TYPE,
            }
          );
          // Get wallet info
          const address = await window.arweaveWallet.getActiveAddress();
          const publicKey = await window.arweaveWallet.getActivePublicKey();
          
          const walletInfo: WalletInfo = {
            address,
            publicKey,
          };

          set({
            isAuthenticated: true,
            isConnecting: false,
            wallet: walletInfo,
          });

        } catch (error) {
          console.error('Wallet connection failed:', error);
          set({
            isAuthenticated: false,
            isConnecting: false,
            wallet: null,
          });
          throw error;
        }
      },

      // Disconnect wallet action
      disconnectWallet: () => {
        try {
          window.arweaveWallet?.disconnect();
        } catch (error) {
          console.error('Disconnect error:', error);
        }

        set({
          isAuthenticated: false,
          isConnecting: false,
          wallet: null,
        });
      },

      // Set wallet info
      setWalletInfo: (wallet: WalletInfo) => {
        set({ wallet, isAuthenticated: true });
      },

      // Set connecting state
      setConnecting: (connecting: boolean) => {
        set({ isConnecting: connecting });
      },
    }),
    {
      name: 'yielder-auth-storage', // localStorage key
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        wallet: state.wallet 
      }), // Only persist auth state and wallet info
    }
  )
);

// Convenience hooks for specific parts of the state
export const useAuth = () => {
  const { isAuthenticated, isConnecting, wallet } = useAuthStore();
  return { isAuthenticated, isConnecting, wallet };
};

export const useWalletActions = () => {
  const { connectWallet, disconnectWallet, setWalletInfo, setConnecting } = useAuthStore();
  return { connectWallet, disconnectWallet, setWalletInfo, setConnecting };
};