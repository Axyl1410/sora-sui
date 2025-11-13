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
import {
  Bookmark,
  ChevronsUpDown,
  Copy,
  Home,
  PlusCircle,
  Search,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
    // Exact match for /profiles to avoid matching /profile
    if (path === "/profiles") {
      return location.pathname === "/profiles";
    }
    // For /profile, check if it starts with /profile/ (not /profiles)
    if (path === "/profile") {
      return (
        location.pathname.startsWith("/profile/") &&
        !location.pathname.startsWith("/profiles")
      );
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

                      <SidebarMenuItem>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive("/bookmarks")}
                          tooltip="Bookmarks"
                        >
                          <Link to="/bookmarks">
                            <Bookmark className="size-5" />
                            <span>Bookmarks</span>
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

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/profiles")}
                      tooltip="All Profiles"
                    >
                      <Link to="/profiles">
                        <Users className="size-5" />
                        <span>Profiles</span>
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <SidebarMenuButton className="w-full" size="lg">
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
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Account details</DialogTitle>
                        <DialogDescription>
                          Review your connected wallet information.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 shrink-0 rounded-lg">
                            <AvatarFallback className="rounded-lg">
                              {getInitials(
                                currentProfile?.name,
                                activeAccount.address
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-base">
                              {displayName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-md bg-background px-3 py-2">
                          <p className="min-w-0 flex-1 break-all font-mono text-muted-foreground text-xs">
                            {activeAccount.address}
                          </p>
                          <Button
                            className="h-7 shrink-0"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  activeAccount.address
                                );
                                toast.success("Address copied to clipboard");
                              } catch {
                                toast.error("Failed to copy address");
                              }
                            }}
                            size="icon-sm"
                            variant="ghost"
                          >
                            <Copy className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <p className="text-muted-foreground text-xs">
                          Switch or disconnect your wallet
                        </p>
                        <div className="overflow-hidden rounded-lg border bg-background">
                          <ConnectButton />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
