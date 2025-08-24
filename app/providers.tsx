'use client';

import { WalletProvider as Web3WalletProvider } from './walletcontext/WalletContext';
import { ThemeProvider } from './themecontext/ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Web3WalletProvider>
        {children}
      </Web3WalletProvider>
    </ThemeProvider>
  );
}
