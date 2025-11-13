import {
  ConnectButton,
  useAccounts,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import {
  createRootRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ChevronsUpDown, Home, PlusCircle, Search, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useProfile } from "@/hooks/useBlog";

const RootLayout = () => {
  const currentAccount = useCurrentAccount();
  const accounts = useAccounts();
  const location = useLocation();
  const activeAccount =
    currentAccount || (accounts.length > 0 ? accounts[0] : null);
  const { data: currentProfile } = useProfile(activeAccount?.address);

  const getInitials = (name?: string, address?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (address) {
      return address.slice(2, 4).toUpperCase();
    }
    return "??";
  };

  const displayName =
    currentProfile?.name ||
    (activeAccount
      ? `${activeAccount.address.slice(0, 6)}...${activeAccount.address.slice(-4)}`
      : "Guest");

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") {
      return true;
    }
    if (path !== "/" && location.pathname.startsWith(path)) {
      return true;
    }
    return false;
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Left Sidebar */}
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg">
                  <Link to="/">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <span className="font-semibold text-sm lowercase">S</span>
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none">
                      <span className="font-semibold">Sui Blog</span>
                      <span className="text-muted-foreground text-xs">
                        Decentralized Blog
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/")}
                      tooltip="Home"
                    >
                      <Link to="/">
                        <Home className="size-5" />
                        <span>Home</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {activeAccount && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive("/create")}
                          tooltip="Create Post"
                        >
                          <Link to="/create">
                            <PlusCircle className="size-5" />
                            <span>Create</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>

                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive("/profile")}
                          tooltip="Profile"
                        >
                          <Link
                            params={{ address: activeAccount.address }}
                            to="/profile/$address"
                          >
                            <User className="size-5" />
                            <span>Profile</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Search">
                      <Link to="/">
                        <Search className="size-5" />
                        <span>Search</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            {activeAccount ? (
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        size="lg"
                      >
                        <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                          <AvatarFallback className="rounded-lg">
                            {getInitials(
                              currentProfile?.name,
                              activeAccount.address
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-medium">
                            {displayName}
                          </span>
                          <span className="truncate text-xs">
                            {activeAccount.address.slice(0, 8)}...
                            {activeAccount.address.slice(-6)}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                      side="right"
                      sideOffset={4}
                    >
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-lg">
                          <AvatarFallback className="rounded-lg">
                            {getInitials(
                              currentProfile?.name,
                              activeAccount.address
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-medium">
                            {displayName}
                          </span>
                          <span className="truncate text-xs">
                            {activeAccount.address.slice(0, 8)}...
                            {activeAccount.address.slice(-6)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <ConnectButton />
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild size="lg">
                    <div>
                      <ConnectButton />
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          <main className="flex flex-1 overflow-y-auto">
            {/* Center Column - Feed */}
            <div className="flex-1 border-border border-x">
              <Outlet />
            </div>

            {/* Right Sidebar */}
            <aside className="hidden w-80 border-border border-l lg:block">
              <div className="sticky top-0 space-y-4 p-4">
                {/* Search */}
                <div className="relative">
                  <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
                  <Input
                    className="h-10 rounded-full bg-muted pl-10"
                    placeholder="Search Sui Blog"
                  />
                </div>

                {/* Trends Section */}
                <Card>
                  <CardContent className="p-4">
                    <h2 className="mb-4 font-bold text-xl">Trends for you</h2>
                    <div className="space-y-4">
                      <div className="cursor-pointer space-y-1 rounded-lg p-3 transition-colors hover:bg-accent">
                        <p className="text-muted-foreground text-sm">
                          Trending
                        </p>
                        <p className="font-semibold">#SuiBlockchain</p>
                        <p className="text-muted-foreground text-sm">
                          1.2K posts
                        </p>
                      </div>
                      <div className="cursor-pointer space-y-1 rounded-lg p-3 transition-colors hover:bg-accent">
                        <p className="text-muted-foreground text-sm">
                          Trending
                        </p>
                        <p className="font-semibold">#Web3</p>
                        <p className="text-muted-foreground text-sm">
                          856 posts
                        </p>
                      </div>
                      <div className="cursor-pointer space-y-1 rounded-lg p-3 transition-colors hover:bg-accent">
                        <p className="text-muted-foreground text-sm">
                          Trending
                        </p>
                        <p className="font-semibold">#MoveLanguage</p>
                        <p className="text-muted-foreground text-sm">
                          432 posts
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Who to Follow */}
                <Card>
                  <CardContent className="p-4">
                    <h2 className="mb-4 font-bold text-xl">Who to follow</h2>
                    <p className="text-muted-foreground text-sm">
                      Suggestions coming soon...
                    </p>
                  </CardContent>
                </Card>
              </div>
            </aside>
          </main>
        </SidebarInset>
      </div>
      <Toaster position="bottom-right" />
      <TanStackRouterDevtools />
    </SidebarProvider>
  );
};

export const Route = createRootRoute({ component: RootLayout });
