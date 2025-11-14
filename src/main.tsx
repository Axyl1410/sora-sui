import { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "@mysten/dapp-kit/dist/index.css";
import "@radix-ui/themes/styles.css";

import {
  SuiClientProvider,
  useSuiClientContext,
  WalletProvider,
} from "@mysten/dapp-kit";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";
import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import React from "react";
import { networkConfig } from "./networkConfig.ts";
// Import the generated route tree
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();

const ENOKI_API_KEY = import.meta.env.VITE_ENOKI_API_KEY;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Theme appearance="light">
        <QueryClientProvider client={queryClient}>
          <SuiClientProvider defaultNetwork="testnet" networks={networkConfig}>
            <RegisterEnokiWallets />
            <WalletProvider autoConnect>
              <RouterProvider router={router} />
            </WalletProvider>
          </SuiClientProvider>
        </QueryClientProvider>
      </Theme>
    </React.StrictMode>
  );
}

function RegisterEnokiWallets() {
  const { client, network } = useSuiClientContext();
  useEffect(() => {
    if (!isEnokiNetwork(network)) {
      return;
    }

    const { unregister } = registerEnokiWallets({
      apiKey: ENOKI_API_KEY,
      providers: {
        // Provide the client IDs for each of the auth providers you want to use:
        google: {
          clientId: GOOGLE_CLIENT_ID,
        },
      },
      client,
      network,
    });
    return unregister;
  }, [client, network]);
  return null;
}
