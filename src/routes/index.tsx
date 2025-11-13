import { useCurrentAccount } from "@mysten/dapp-kit";
import { Heading, Text } from "@radix-ui/themes";
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

  // Check if user needs to create profile
  useEffect(() => {
    if (
      currentAccount &&
      !profileLoading &&
      !currentProfile &&
      registries?.profileRegistry
    ) {
      // User is connected but doesn't have a profile
      // Don't auto-show, let them click a button
    }
  }, [currentAccount, currentProfile, profileLoading, registries]);

  // Get author names from profiles (simplified - in production, you'd want to cache this)
  const postsWithNames =
    posts?.map((post) => ({
      ...post,
      authorName:
        post.author === currentAccount?.address
          ? currentProfile?.name
          : undefined,
    })) ?? [];

  const handlePostCreated = () => {
    // Invalidate posts query to refetch
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
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <div className="flex items-center justify-center py-12">
          <ClipLoader size={32} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <Text color="red">Error loading posts: {error.message}</Text>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Heading size="8">Home</Heading>
      </div>

      {currentAccount && (
        <>
          {shouldShowCreateProfile && (
            <div className="rounded-lg border bg-muted p-4 text-center">
              <Text className="mb-2 block">
                Create a profile to start posting
              </Text>
              <Button onClick={() => setShowCreateProfile(true)}>
                Create Profile
              </Button>
            </div>
          )}
          {currentProfile && <CreatePostForm onSuccess={handlePostCreated} />}
          <CreateProfileDialog
            onOpenChange={setShowCreateProfile}
            onSuccess={handleProfileCreated}
            open={showCreateProfile}
          />
        </>
      )}

      <div>
        <Heading className="mb-4" size="6">
          Latest Posts
        </Heading>
        <PostList
          emptyMessage="No posts yet. Be the first to post!"
          isOwner={(author) => currentAccount?.address === author}
          posts={postsWithNames}
        />
      </div>
    </div>
  );
}
