import { ConnectButton } from "@mysten/dapp-kit";
import { Box, Container, Flex, Heading } from "@radix-ui/themes";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";

const RootLayout = () => (
  <>
    <Flex
      justify="between"
      position="sticky"
      px="4"
      py="2"
      style={{
        borderBottom: "1px solid var(--gray-a2)",
      }}
    >
      <Box>
        <Flex align="center" gap="4">
          <Heading>dApp Starter Template</Heading>
          <Link className="text-sm hover:underline [&.active]:font-bold" to="/">
            Home
          </Link>
          <Link
            className="text-sm hover:underline [&.active]:font-bold"
            to="/about"
          >
            About
          </Link>
        </Flex>
      </Box>

      <Box>
        <ConnectButton />
      </Box>
    </Flex>
    <Container>
      <Container
        mt="5"
        pt="2"
        px="4"
        style={{ background: "var(--gray-a2)", minHeight: 500 }}
      >
        <Outlet />
      </Container>
    </Container>
    <Toaster closeButton position="top-center" />
    <TanStackRouterDevtools />
  </>
);

export const Route = createRootRoute({ component: RootLayout });
