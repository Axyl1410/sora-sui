import React from "react";
import ReactDOM from "react-dom/client";
import "@mysten/dapp-kit/dist/index.css";
import "@radix-ui/themes/styles.css";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { networkConfig } from "./networkConfig.ts";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

const queryClient = new QueryClient();

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
            <WalletProvider autoConnect>
              <RouterProvider router={router} />
            </WalletProvider>
          </SuiClientProvider>
        </QueryClientProvider>
      </Theme>
    </React.StrictMode>
  );
}
