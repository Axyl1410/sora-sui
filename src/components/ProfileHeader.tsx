import { useCurrentAccount } from "@mysten/dapp-kit";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, Edit, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  useFollowUser,
  useIsFollowing,
  useProfile,
  useUnfollowUser,
} from "@/hooks/useBlog";

type ProfileHeaderProps = {
  address: string;
  name?: string;
  bio?: string;
  postCount?: number;
  createdAt?: number;
  followerCount?: number;
  followingCount?: number;
  isOwnProfile?: boolean;
  profileId?: string;
};

export function ProfileHeader({
  address,
  name,
  bio,
  postCount = 0,
  createdAt,
  followerCount = 0,
  followingCount = 0,
  profileId,
}: ProfileHeaderProps) {
  const currentAccount = useCurrentAccount();
  const isCurrentUser = currentAccount?.address === address;
  const [showEditDialog, setShowEditDialog] = useState(false);
  const queryClient = useQueryClient();

  // Get current user's profile to get profile ID for follow/unfollow
  const { data: currentUserProfile } = useProfile(currentAccount?.address);
  const { data: isFollowing } = useIsFollowing(
    currentAccount?.address,
    address
  );
  const { followUser, isPending: isFollowingPending } = useFollowUser();
  const { unfollowUser, isPending: isUnfollowingPending } = useUnfollowUser();

  const handleFollow = async () => {
    if (!(currentUserProfile?.id && address)) return;

    try {
      if (isFollowing) {
        await unfollowUser(currentUserProfile.id, address);
        toast.success("Unfollowed successfully");
      } else {
        await followUser(currentUserProfile.id, address);
        toast.success("Followed successfully");
      }
      queryClient.invalidateQueries({ queryKey: ["profile", address] });
      queryClient.invalidateQueries({
        queryKey: ["profile", currentAccount?.address],
      });
      queryClient.invalidateQueries({ queryKey: ["is-following"] });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to toggle follow";
      console.error("Error toggling follow:", error);
      toast.error(errorMessage);
    }
  };

  const getInitials = (profileName?: string, profileAddress?: string) => {
    if (profileName) {
      return profileName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (profileAddress) {
      return profileAddress.slice(2, 4).toUpperCase();
    }
    return "??";
  };

  const displayName = name || `${address.slice(0, 6)}...${address.slice(-4)}`;
  const displayHandle = `@${address.slice(0, 8)}...${address.slice(-6)}`;

  return (
    <div className="flex flex-col">
      {/* Banner */}
      <div className="h-48 bg-linear-to-r from-blue-400 to-blue-600" />

      {/* Profile Section */}
      <div className="relative px-4 pb-4">
        {/* Avatar - Overlapping Banner */}
        <div className="-mt-20 mb-4 md:mb-0">
          <Avatar className="size-32 border-4 border-background">
            <AvatarFallback className="text-3xl">
              {getInitials(name, address)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Edit Profile Button */}
        {isCurrentUser && profileId && (
          <div className="mb-4 flex justify-end md:mb-0">
            <Button
              className="rounded-full"
              onClick={() => setShowEditDialog(true)}
              size="sm"
              variant="outline"
            >
              <Edit className="mr-2 size-4" />
              Edit Profile
            </Button>
          </div>
        )}

        {/* Profile Info */}
        <div className="space-y-3">
          <div>
            <h1 className="font-bold text-2xl">{displayName}</h1>
            <p className="text-muted-foreground text-sm">{displayHandle}</p>
          </div>

          {bio && (
            <p className="wrap-break-word whitespace-pre-wrap text-sm">{bio}</p>
          )}

          {/* Additional Info */}
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
            {createdAt && (
              <div className="flex items-center gap-1">
                <Calendar className="size-4" />
                <span>
                  Joined{" "}
                  {new Date(createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{postCount}</span>
              <span className="text-muted-foreground">
                {postCount === 1 ? "Post" : "Posts"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{followerCount}</span>
              <span className="text-muted-foreground">
                {followerCount === 1 ? "Follower" : "Followers"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold">{followingCount}</span>
              <span className="text-muted-foreground">Following</span>
            </div>
          </div>

          {/* Follow/Unfollow Button */}
          {!isCurrentUser && currentAccount && currentUserProfile && (
            <div className="mt-4">
              <Button
                className="rounded-full"
                disabled={isFollowingPending || isUnfollowingPending}
                onClick={handleFollow}
                size="sm"
                variant={isFollowing ? "outline" : "default"}
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="mr-2 size-4" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 size-4" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Dialog */}
      {profileId && (
        <EditProfileDialog
          initialBio={bio ?? ""}
          initialName={name ?? ""}
          onOpenChange={setShowEditDialog}
          onSuccess={() => {
            // Profile will be refetched automatically via query invalidation
          }}
          open={showEditDialog}
          profileId={profileId}
        />
      )}
    </div>
  );
}
