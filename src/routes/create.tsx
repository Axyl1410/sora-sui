import { useCurrentAccount } from "@mysten/dapp-kit";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CreatePostForm } from "@/components/CreatePostForm";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const Route = createFileRoute("/create")({
  component: CreatePostPage,
});

function CreatePostPage() {
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!currentAccount) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">
          Please connect your wallet to create a post
        </p>
      </div>
    );
  }

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    navigate({ to: "/" });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-border border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="font-bold text-xl">Create Post</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <CreatePostForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
