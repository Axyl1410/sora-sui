import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNetworkVariable } from "@/networkConfig";
import { parseMoveError } from "../error-handling";
import { useBlogRegistries } from "../registries";

// Hook to follow user
export function useFollowUser() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const followUser = (
    followerProfileId: string,
    followingAddress: string // CẢI TIẾN: Chỉ cần address, không cần profile object
  ) => {
    // Return rejected promise instead of throwing synchronously
    // This ensures errors are caught by try-catch blocks
    if (!(registries?.followRegistry && registries?.profileRegistry)) {
      const errorMessage =
        "Registry not found. Please ensure all registry IDs are configured.";
      setError(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(followerProfileId),
        tx.object(registries.profileRegistry),
        tx.pure.address(followingAddress), // CẢI TIẾN: Dùng pure address thay vì object
        tx.object(registries.followRegistry),
      ],
      target: `${blogPackageId}::blog::follow_user`,
    });

    return new Promise<void>((resolve, reject) => {
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async ({ digest }) => {
            try {
              await suiClient.waitForTransaction({ digest });
              // Invalidate all profile-related queries to refresh follower/following counts
              queryClient.invalidateQueries({ queryKey: ["profile"] });
              queryClient.invalidateQueries({ queryKey: ["follower-count"] });
              queryClient.invalidateQueries({ queryKey: ["following-count"] });
              queryClient.invalidateQueries({ queryKey: ["is-following"] });
              resolve();
            } catch (err) {
              const errorMessage = parseMoveError(err);
              setError(errorMessage);
              reject(new Error(errorMessage));
            }
          },
          onError: (err) => {
            const errorMessage = parseMoveError(err);
            setError(errorMessage);
            reject(new Error(errorMessage));
          },
        }
      );
    });
  };

  return { followUser, isPending, error };
}

// Hook to unfollow user
export function useUnfollowUser() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const unfollowUser = (
    followerProfileId: string,
    followingAddress: string // CẢI TIẾN: Chỉ cần address, không cần profile object
  ) => {
    // Return rejected promise instead of throwing synchronously
    // This ensures errors are caught by try-catch blocks
    if (!registries?.followRegistry) {
      const errorMessage =
        "Follow registry not found. Please ensure all registry IDs are configured.";
      setError(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(followerProfileId),
        tx.pure.address(followingAddress), // CẢI TIẾN: Dùng pure address thay vì object
        tx.object(registries.followRegistry),
      ],
      target: `${blogPackageId}::blog::unfollow_user`,
    });

    return new Promise<void>((resolve, reject) => {
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async ({ digest }) => {
            try {
              await suiClient.waitForTransaction({ digest });
              // Invalidate all profile-related queries to refresh follower/following counts
              queryClient.invalidateQueries({ queryKey: ["profile"] });
              queryClient.invalidateQueries({ queryKey: ["follower-count"] });
              queryClient.invalidateQueries({ queryKey: ["following-count"] });
              queryClient.invalidateQueries({ queryKey: ["is-following"] });
              resolve();
            } catch (err) {
              const errorMessage = parseMoveError(err);
              setError(errorMessage);
              reject(new Error(errorMessage));
            }
          },
          onError: (err) => {
            const errorMessage = parseMoveError(err);
            setError(errorMessage);
            reject(new Error(errorMessage));
          },
        }
      );
    });
  };

  return { unfollowUser, isPending, error };
}

// Hook to get follower count for a user (calculated from events)
export function useFollowerCount(userAddress: string | undefined) {
  const suiClient = useSuiClient();
  const blogPackageId = useNetworkVariable("blogPackageId");

  return useQuery({
    queryKey: ["follower-count", userAddress, blogPackageId],
    queryFn: async () => {
      if (!(userAddress && blogPackageId)) {
        return 0;
      }

      try {
        const userFollowedType = `${blogPackageId}::blog::UserFollowed`;
        const userUnfollowedType = `${blogPackageId}::blog::UserUnfollowed`;

        // Get all follow events where this user is being followed
        const followEvents = await suiClient.queryEvents({
          query: { MoveEventType: userFollowedType },
          limit: 1000,
          order: "descending",
        });

        // Get all unfollow events where this user is being unfollowed
        const unfollowEvents = await suiClient.queryEvents({
          query: { MoveEventType: userUnfollowedType },
          limit: 1000,
          order: "descending",
        });

        // Count unique followers
        const followerSet = new Set<string>();

        // Add all followers
        followEvents.data.forEach((event) => {
          const parsed = event.parsedJson as {
            follower: string;
            following: string;
          };
          if (parsed.following === userAddress) {
            followerSet.add(parsed.follower);
          }
        });

        // Remove unfollowers (if they unfollowed after following)
        unfollowEvents.data.forEach((unfollowEvent) => {
          const parsed = unfollowEvent.parsedJson as {
            follower: string;
            following: string;
          };
          if (parsed.following === userAddress) {
            // Check if there's a follow event before this unfollow
            const followEvent = followEvents.data.find((event) => {
              const followParsed = event.parsedJson as {
                follower: string;
                following: string;
              };
              return (
                followParsed.follower === parsed.follower &&
                followParsed.following === userAddress &&
                event.id.txDigest < unfollowEvent.id.txDigest
              );
            });

            // If there's a follow event before unfollow, remove from set
            if (followEvent) {
              followerSet.delete(parsed.follower);
            }
          }
        });

        return followerSet.size;
      } catch {
        return 0;
      }
    },
    enabled: !!(userAddress && blogPackageId),
  });
}

// Hook to get following count for a user (calculated from events)
export function useFollowingCount(userAddress: string | undefined) {
  const suiClient = useSuiClient();
  const blogPackageId = useNetworkVariable("blogPackageId");

  return useQuery({
    queryKey: ["following-count", userAddress, blogPackageId],
    queryFn: async () => {
      if (!(userAddress && blogPackageId)) {
        return 0;
      }

      try {
        const userFollowedType = `${blogPackageId}::blog::UserFollowed`;
        const userUnfollowedType = `${blogPackageId}::blog::UserUnfollowed`;

        // Get all follow events where this user is following others
        const followEvents = await suiClient.queryEvents({
          query: { MoveEventType: userFollowedType },
          limit: 1000,
          order: "descending",
        });

        // Get all unfollow events where this user is unfollowing others
        const unfollowEvents = await suiClient.queryEvents({
          query: { MoveEventType: userUnfollowedType },
          limit: 1000,
          order: "descending",
        });

        // Count unique following
        const followingSet = new Set<string>();

        // Add all following
        followEvents.data.forEach((event) => {
          const parsed = event.parsedJson as {
            follower: string;
            following: string;
          };
          if (parsed.follower === userAddress) {
            followingSet.add(parsed.following);
          }
        });

        // Remove unfollowed users (if they unfollowed after following)
        unfollowEvents.data.forEach((unfollowEvent) => {
          const parsed = unfollowEvent.parsedJson as {
            follower: string;
            following: string;
          };
          if (parsed.follower === userAddress) {
            // Check if there's a follow event before this unfollow
            const followEvent = followEvents.data.find((event) => {
              const followParsed = event.parsedJson as {
                follower: string;
                following: string;
              };
              return (
                followParsed.follower === userAddress &&
                followParsed.following === parsed.following &&
                event.id.txDigest < unfollowEvent.id.txDigest
              );
            });

            // If there's a follow event before unfollow, remove from set
            if (followEvent) {
              followingSet.delete(parsed.following);
            }
          }
        });

        return followingSet.size;
      } catch {
        return 0;
      }
    },
    enabled: !!(userAddress && blogPackageId),
  });
}

// Hook to check if user is following another user
export function useIsFollowing(
  followerAddress: string | undefined,
  followingAddress: string | undefined
) {
  const suiClient = useSuiClient();
  const blogPackageId = useNetworkVariable("blogPackageId");

  return useQuery({
    queryKey: [
      "is-following",
      followerAddress,
      followingAddress,
      blogPackageId,
    ],
    queryFn: async () => {
      if (!(followerAddress && followingAddress && blogPackageId)) {
        return false;
      }

      try {
        const userFollowedType = `${blogPackageId}::blog::UserFollowed`;

        const events = await suiClient.queryEvents({
          query: { MoveEventType: userFollowedType },
          limit: 100,
          order: "descending",
        });

        const followEvent = events.data.find((event) => {
          const parsed = event.parsedJson as {
            follower: string;
            following: string;
          };
          return (
            parsed.follower === followerAddress &&
            parsed.following === followingAddress
          );
        });

        if (!followEvent) {
          return false;
        }

        // Check if there's an unfollow event after the follow
        const userUnfollowedType = `${blogPackageId}::blog::UserUnfollowed`;
        const unfollowEvents = await suiClient.queryEvents({
          query: { MoveEventType: userUnfollowedType },
          limit: 100,
          order: "descending",
        });

        const unfollowEvent = unfollowEvents.data.find((event) => {
          const parsed = event.parsedJson as {
            follower: string;
            following: string;
          };
          return (
            parsed.follower === followerAddress &&
            parsed.following === followingAddress &&
            event.id.txDigest > followEvent.id.txDigest
          );
        });

        return !unfollowEvent;
      } catch {
        return false;
      }
    },
    enabled: !!(followerAddress && followingAddress && blogPackageId),
  });
}
