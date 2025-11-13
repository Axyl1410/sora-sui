import { useCurrentAccount } from "@mysten/dapp-kit";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import { CreatePostForm } from "@/components/CreatePostForm";
import { CreateProfileDialog } from "@/components/CreateProfileDialog";
import { PostList } from "@/components/PostList";
import { Button } from "@/components/ui/button";
import { useBlogRegistries, usePosts, useProfile } from "@/hooks/useBlog";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: posts, isLoading, error } = usePosts(50);
  const { data: currentProfile, isLoading: profileLoading } = useProfile(
    currentAccount?.address
  );
  const { data: registries } = useBlogRegistries();
  const [showCreateProfile, setShowCreateProfile] = useState(false);

  useEffect(() => {
    if (
      currentAccount &&
      !profileLoading &&
      !currentProfile &&
      registries?.profileRegistry
    ) {
      // User is connected but doesn't have a profile
    }
  }, [currentAccount, currentProfile, profileLoading, registries]);

  const postsWithNames =
    posts?.map((post) => ({
      ...post,
      authorName:
        post.author === currentAccount?.address
          ? currentProfile?.name
          : undefined,
    })) ?? [];

  const handlePostCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
    queryClient.invalidateQueries({ queryKey: ["author-posts"] });
    navigate({ to: "/" });
  };

  const handleProfileCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    setShowCreateProfile(false);
  };

  const shouldShowCreateProfile =
    currentAccount && !currentProfile && !profileLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <ClipLoader size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Error loading posts: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-border border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <h1 className="font-bold text-xl">Home</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {currentAccount && (
          <>
            {shouldShowCreateProfile && (
              <div className="border-border border-b bg-muted/50 p-4 text-center">
                <p className="mb-2 text-sm">
                  Create a profile to start posting
                </p>
                <Button onClick={() => setShowCreateProfile(true)} size="sm">
                  Create Profile
                </Button>
              </div>
            )}
            {currentProfile && (
              <div className="border-border border-b p-4">
                <CreatePostForm onSuccess={handlePostCreated} />
              </div>
            )}
            <CreateProfileDialog
              onOpenChange={setShowCreateProfile}
              onSuccess={handleProfileCreated}
              open={showCreateProfile}
            />
          </>
        )}

        {/* Posts Feed */}
        <div className="divide-y divide-border">
          <PostList
            emptyMessage="No posts yet. Be the first to post!"
            isOwner={(author) => currentAccount?.address === author}
            posts={postsWithNames}
          />
        </div>
      </div>
    </div>
  );
}
