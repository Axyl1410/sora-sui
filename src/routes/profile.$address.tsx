import { useCurrentAccount } from "@mysten/dapp-kit";
import { createFileRoute } from "@tanstack/react-router";
import ClipLoader from "react-spinners/ClipLoader";
import { PostList } from "@/components/PostList";
import { ProfileHeader } from "@/components/ProfileHeader";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        <div className="flex h-14 items-center gap-4 px-4">
          <SidebarTrigger className="md:hidden" />
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

        {/* Tabs Navigation */}
        <Tabs className="w-full" defaultValue="posts">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              className="rounded-none border-transparent border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              value="posts"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger
              className="rounded-none border-transparent border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              disabled
              value="replies"
            >
              Posts & replies
            </TabsTrigger>
            <TabsTrigger
              className="rounded-none border-transparent border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              disabled
              value="media"
            >
              Media
            </TabsTrigger>
            <TabsTrigger
              className="rounded-none border-transparent border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
              disabled
              value="likes"
            >
              Likes
            </TabsTrigger>
          </TabsList>

          <TabsContent className="mt-0" value="posts">
            <PostList
              emptyMessage={
                isOwnProfile
                  ? "You haven't posted anything yet. Create your first post!"
                  : "This user hasn't posted anything yet."
              }
              isOwner={(author) => currentAccount?.address === author}
              posts={postsWithNames}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
