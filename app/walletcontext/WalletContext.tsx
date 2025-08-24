'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";

type WalletContextType = {
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  connecting: boolean;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Type for the Solana object
type Solana = {
  isPhantom?: boolean;
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (arg: any) => void) => void;
  off: (event: string, callback: (arg: any) => void) => void;
};

// Extend the Window interface
declare global {
  interface Window {
    solana?: Solana;
  }
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({
  children,
}: WalletProviderProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const solana = window.solana;
    if (!solana) {
      console.warn('Solana object not found! Make sure you have Phantom installed.');
      return;
    }

    const handleConnect = () => {
      console.log('Connected to Phantom wallet');
    };

    const handleDisconnect = () => {
      console.log('Disconnected from Phantom wallet');
      setWalletAddress(null);
      localStorage.removeItem('walletAddress');
    };

    try {
      // Set up event listeners
      solana.on('connect', handleConnect);
      solana.on('disconnect', handleDisconnect);

      // Cleanup function
      return () => {
        try {
          if (solana) {
            solana.off('connect', handleConnect);
            solana.off('disconnect', handleDisconnect);
          }
        } catch (error) {
          console.error('Error cleaning up event listeners:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up wallet event listeners:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedAddress = localStorage.getItem('walletAddress');
    const shouldAutoConnect = localStorage.getItem('autoConnect') === 'true';
    
    // Early return if no auto-connect needed
    if (!savedAddress || !shouldAutoConnect) return;
    
    const solana = window.solana;
    if (!solana?.isPhantom) {
      console.warn('Phantom wallet not found for auto-connect');
      return;
    }
    
    console.log('Attempting auto-connect to Phantom wallet');
    solana
      .connect({ onlyIfTrusted: true })
      .then((resp: { publicKey: { toString: () => string } }) => {
        const address = resp.publicKey.toString();
        if (address === savedAddress) {
          setWalletAddress(address);
        } else {
          // Clear invalid saved address
          localStorage.removeItem('walletAddress');
          localStorage.removeItem('autoConnect');
        }
      })
      .catch((error: Error) => {
        console.error('Auto-connect failed:', error);
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('autoConnect');
      });
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined') {
      console.error('Window is not available');
      return;
    }
    
    const solana = window.solana;
    if (!solana) {
      console.warn('Phantom wallet not found, redirecting to install page');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    setConnecting(true);
    
    try {
      const response = await solana.connect();
      const address = response.publicKey.toString();
      
      setWalletAddress(address);
      localStorage.setItem('walletAddress', address);
      localStorage.setItem('autoConnect', 'true');
      
      console.log('Connected to wallet:', address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, [setWalletAddress, setConnecting]);

  const disconnectWallet = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const solana = window.solana;
    if (solana) {
      solana.disconnect().catch((error: Error) => {
        console.error('Error disconnecting wallet:', error);
      });
    }
    
    setWalletAddress(null);
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('autoConnect');
  }, []);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        connectWallet,
        disconnectWallet,
        connecting,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}