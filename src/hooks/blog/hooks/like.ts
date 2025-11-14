import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import type { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNetworkVariable } from "@/networkConfig";
import { parseMoveError } from "../error-handling";
import { fetchPostObjects } from "../helpers";
import { useBlogRegistries } from "../registries";

// Helper function to check like status from events
async function checkLikeStatus(
  suiClient: SuiClient,
  blogPackageId: string,
  postId: string,
  userAddress: string
): Promise<boolean> {
  const postLikedType = `${blogPackageId}::blog::PostLiked`;
  const postUnlikedType = `${blogPackageId}::blog::PostUnliked`;

  // Query like events
  const likeEvents = await suiClient.queryEvents({
    query: { MoveEventType: postLikedType },
    limit: 1000,
    order: "descending",
  });

  // Query unlike events
  const unlikeEvents = await suiClient.queryEvents({
    query: { MoveEventType: postUnlikedType },
    limit: 1000,
    order: "descending",
  });

  // Find like events for this post and user
  const userLikeEvents = likeEvents.data.filter((event) => {
    const parsed = event.parsedJson as {
      post_id: string;
      user: string;
    };
    return parsed.post_id === postId && parsed.user === userAddress;
  });

  // Find unlike events for this post and user
  const userUnlikeEvents = unlikeEvents.data.filter((event) => {
    const parsed = event.parsedJson as {
      post_id: string;
      user: string;
    };
    return parsed.post_id === postId && parsed.user === userAddress;
  });

  // If no events, not liked
  if (userLikeEvents.length === 0 && userUnlikeEvents.length === 0) {
    return false;
  }

  // Get most recent event timestamps
  const likeTimestamps = userLikeEvents.map((e) => Number(e.timestampMs || 0));
  const unlikeTimestamps = userUnlikeEvents.map((e) =>
    Number(e.timestampMs || 0)
  );

  const latestLikeTime =
    likeTimestamps.length > 0 ? Math.max(...likeTimestamps) : 0;
  const latestUnlikeTime =
    unlikeTimestamps.length > 0 ? Math.max(...unlikeTimestamps) : 0;

  // If only like events exist, it's liked
  if (latestLikeTime > 0 && latestUnlikeTime === 0) {
    return true;
  }

  // If only unlike events exist, it's not liked
  if (latestLikeTime === 0 && latestUnlikeTime > 0) {
    return false;
  }

  // Both exist - check which is more recent
  return latestLikeTime > latestUnlikeTime;
}

// Hook to like post
export function useLikePost() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const likePost = (postId: string) => {
    if (!registries?.likeRegistry) {
      throw new Error("Like registry not found");
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [tx.object(postId), tx.object(registries.likeRegistry)],
      target: `${blogPackageId}::blog::like_post`,
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
              queryClient.invalidateQueries({ queryKey: ["posts"] });
              queryClient.invalidateQueries({ queryKey: ["post", postId] });
              queryClient.invalidateQueries({ queryKey: ["author-posts"] });
              queryClient.invalidateQueries({ queryKey: ["has-liked"] });
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

  return { likePost, isPending, error };
}

// Hook to unlike post
export function useUnlikePost() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const unlikePost = (postId: string) => {
    if (!registries?.likeRegistry) {
      throw new Error("Like registry not found");
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [tx.object(postId), tx.object(registries.likeRegistry)],
      target: `${blogPackageId}::blog::unlike_post`,
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
              queryClient.invalidateQueries({ queryKey: ["posts"] });
              queryClient.invalidateQueries({ queryKey: ["post", postId] });
              queryClient.invalidateQueries({ queryKey: ["author-posts"] });
              queryClient.invalidateQueries({ queryKey: ["has-liked"] });
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

  return { unlikePost, isPending, error };
}

// Hook to check if user liked a post
export function useHasLiked(
  postId: string | undefined,
  userAddress: string | undefined
) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { data: registries } = useBlogRegistries();

  return useQuery({
    queryKey: ["has-liked", postId, userAddress, blogPackageId],
    queryFn: async () => {
      if (!postId) {
        return false;
      }
      if (!userAddress) {
        return false;
      }
      if (!blogPackageId) {
        return false;
      }
      if (!registries?.likeRegistry) {
        return false;
      }

      try {
        return await checkLikeStatus(
          suiClient,
          blogPackageId,
          postId,
          userAddress
        );
      } catch {
        return false;
      }
    },
    enabled: !!(
      postId &&
      userAddress &&
      blogPackageId &&
      registries?.likeRegistry
    ),
  });
}

// Hook to get liked posts for a user
export function useLikedPosts(userAddress: string | undefined) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["liked-posts", userAddress, blogPackageId],
    queryFn: async () => {
      if (!userAddress) {
        return [];
      }
      if (!blogPackageId) {
        return [];
      }

      try {
        const postLikedType = `${blogPackageId}::blog::PostLiked`;

        // Query all PostLiked events
        const events = await suiClient.queryEvents({
          query: { MoveEventType: postLikedType },
          limit: 1000,
          order: "descending",
        });

        // Filter likes for this user
        const userLikes = events.data
          .map((event) => {
            const parsed = event.parsedJson as {
              post_id: string;
              user: string;
            };
            return parsed.user === userAddress ? parsed.post_id : null;
          })
          .filter(Boolean) as string[];

        // Remove duplicates
        const uniquePostIds = Array.from(new Set(userLikes));

        // Check for unliked posts
        const postUnlikedType = `${blogPackageId}::blog::PostUnliked`;
        const unlikeEvents = await suiClient.queryEvents({
          query: { MoveEventType: postUnlikedType },
          limit: 1000,
          order: "descending",
        });

        const unlikedIds = new Set(
          unlikeEvents.data
            .map((event) => {
              const parsed = event.parsedJson as {
                post_id: string;
                user: string;
              };
              return parsed.user === userAddress ? parsed.post_id : null;
            })
            .filter(Boolean) as string[]
        );

        // Filter out unliked posts
        const activeLikeIds = uniquePostIds.filter((id) => !unlikedIds.has(id));

        // Fetch post objects
        const posts = await fetchPostObjects(suiClient, activeLikeIds);

        // Sort by createdAt descending (newest first)
        return posts.sort((a, b) => b.createdAt - a.createdAt);
      } catch {
        return [];
      }
    },
    enabled: !!userAddress && !!blogPackageId,
  });
}
