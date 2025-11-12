import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Box, Flex, Heading } from "@radix-ui/themes";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Home, PlusCircle, User } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

const RootLayout = () => {
  const currentAccount = useCurrentAccount();

  return (
    <>
      <Flex
        justify="between"
        position="sticky"
        px="4"
        py="3"
        style={{
          borderBottom: "1px solid var(--gray-a2)",
          backgroundColor: "var(--color-background)",
          zIndex: 50,
        }}
        top="0"
      >
        <Box>
          <Flex align="center" gap="6">
            <Link className="transition-opacity hover:opacity-80" to="/">
              <Heading size="6">Sui Blog</Heading>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                className="flex items-center gap-2 text-sm hover:underline [&.active]:font-bold"
                to="/"
              >
                <Home className="size-4" />
                Home
              </Link>
              {currentAccount && (
                <>
                  <Link
                    className="flex items-center gap-2 text-sm hover:underline [&.active]:font-bold"
                    to="/create"
                  >
                    <PlusCircle className="size-4" />
                    Create
                  </Link>
                  <Link
                    className="flex items-center gap-2 text-sm hover:underline [&.active]:font-bold"
                    params={{ address: currentAccount.address }}
                    to="/profile/$address"
                  >
                    <User className="size-4" />
                    Profile
                  </Link>
                </>
              )}
            </nav>
          </Flex>
        </Box>

        <Box>
          <ConnectButton />
        </Box>
      </Flex>
      <Box style={{ minHeight: "calc(100vh - 60px)" }}>
        <Outlet />
      </Box>
      <Toaster position="bottom-right" />
      <TanStackRouterDevtools />
    </>
  );
};

export const Route = createRootRoute({ component: RootLayout });
