"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { config } from "./config";
import { bridgeConfig } from "./bridgeConfig";
import { viaBridgeConfig } from "./viaBridgeConfig";
import React from "react";
import { ConnectPopupProvider } from "../hooks/ConnectPopupContext";

const queryClient = new QueryClient();

type AppType = 'swap' | 'bridge' | 'via-bridge';

interface WagmiProviderWrapperProps {
  children: React.ReactNode;
  appType: AppType;
}

export default function WagmiProviderWrapper({
  children,
  appType = 'swap',
}: WagmiProviderWrapperProps) {
  const wagmiConfig =
    appType === 'bridge'
      ? bridgeConfig
      : appType === 'via-bridge'
      ? viaBridgeConfig
      : config;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectPopupProvider>
          <RainbowKitProvider key={appType} theme={darkTheme()} modalSize="compact">
            {children}
          </RainbowKitProvider>
        </ConnectPopupProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
