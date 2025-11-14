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
    followingProfileId: string
  ) => {
    if (!registries?.followRegistry) {
      throw new Error("Follow registry not found");
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(followerProfileId),
        tx.object(followingProfileId),
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
              queryClient.invalidateQueries({ queryKey: ["profile"] });
              resolve();
            } catch (err) {
              reject(err);
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
    followingProfileId: string
  ) => {
    if (!registries?.followRegistry) {
      throw new Error("Follow registry not found");
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(followerProfileId),
        tx.object(followingProfileId),
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
              queryClient.invalidateQueries({ queryKey: ["profile"] });
              resolve();
            } catch (err) {
              reject(err);
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
