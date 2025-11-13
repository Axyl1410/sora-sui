import { useCurrentAccount } from "@mysten/dapp-kit";
import { Heading, Text } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import ClipLoader from "react-spinners/ClipLoader";
import { PostList } from "@/components/PostList";
import { ProfileHeader } from "@/components/ProfileHeader";
import { useAuthorPosts, useProfile } from "@/hooks/useBlog";

export const Route = createFileRoute("/profile/$address")({
  component: ProfilePage,
});

function ProfilePage() {
  const currentAccount = useCurrentAccount();
  const { address } = Route.useParams();
  const isOwnProfile = currentAccount?.address === address;

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfile(address);
  const {
    data: posts,
    isLoading: postsLoading,
    error: postsError,
  } = useAuthorPosts(address);

  if (profileLoading || postsLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <div className="flex items-center justify-center py-12">
          <ClipLoader size={32} />
        </div>
      </div>
    );
  }

  if (profileError || postsError) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-6">
        <Text color="red">
          Error loading profile: {profileError?.message || postsError?.message}
        </Text>
      </div>
    );
  }

  const postsWithNames =
    posts?.map((post) => ({
      ...post,
      authorName: profile?.name,
    })) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <ProfileHeader
        address={address}
        bio={profile?.bio}
        createdAt={profile?.createdAt}
        isOwnProfile={isOwnProfile}
        name={profile?.name}
        postCount={posts?.length ?? 0}
      />

      <div>
        <Heading className="mb-4" size="6">
          Posts
        </Heading>
        <PostList
          emptyMessage={
            isOwnProfile
              ? "You haven't posted anything yet. Create your first post!"
              : "This user hasn't posted anything yet."
          }
          isOwner={(author) => currentAccount?.address === author}
          posts={postsWithNames}
        />
      </div>
    </div>
  );
}
