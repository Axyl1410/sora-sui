import { useCurrentAccount } from "@mysten/dapp-kit";
import { createFileRoute } from "@tanstack/react-router";
import ClipLoader from "react-spinners/ClipLoader";
import { PostList } from "@/components/PostList";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Separator } from "@/components/ui/separator";
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
      <div className="flex h-full items-center justify-center">
        <ClipLoader size={32} />
      </div>
    );
  }

  if (profileError || postsError || !profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">
          {profileError?.message || postsError?.message || "Profile not found"}
        </p>
      </div>
    );
  }

  const postsWithNames =
    posts?.map((post) => ({
      ...post,
      authorName: profile?.name,
    })) ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-border border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <h1 className="font-bold text-xl">
            {isOwnProfile ? "Your Profile" : profile.name}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <ProfileHeader
          address={address}
          bio={profile.bio}
          createdAt={profile.createdAt}
          isOwnProfile={isOwnProfile}
          name={profile.name}
          postCount={posts?.length ?? 0}
          profileId={profile.id}
        />

        <Separator />

        {/* Posts */}
        <div className="divide-y divide-border">
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
    </div>
  );
}
