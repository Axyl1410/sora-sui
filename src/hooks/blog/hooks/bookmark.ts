import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import type { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNetworkVariable } from "@/networkConfig";
import { parseMoveError } from "../error-handling";
import { fetchPostObjects } from "../helpers";
import { useBlogRegistries } from "../registries";

// Helper function to check bookmark status from events
async function checkBookmarkStatus(
  suiClient: SuiClient,
  blogPackageId: string,
  postId: string,
  userAddress: string
): Promise<boolean> {
  const postBookmarkedType = `${blogPackageId}::blog::PostBookmarked`;
  const postUnbookmarkedType = `${blogPackageId}::blog::PostUnbookmarked`;

  // Query bookmark events
  const bookmarkEvents = await suiClient.queryEvents({
    query: { MoveEventType: postBookmarkedType },
    limit: 1000,
    order: "descending",
  });

  // Query unbookmark events
  const unbookmarkEvents = await suiClient.queryEvents({
    query: { MoveEventType: postUnbookmarkedType },
    limit: 1000,
    order: "descending",
  });

  // Find bookmark events for this post and user
  const userBookmarkEvents = bookmarkEvents.data.filter((event) => {
    const parsed = event.parsedJson as {
      post_id: string;
      user: string;
    };
    return parsed.post_id === postId && parsed.user === userAddress;
  });

  // Find unbookmark events for this post and user
  const userUnbookmarkEvents = unbookmarkEvents.data.filter((event) => {
    const parsed = event.parsedJson as {
      post_id: string;
      user: string;
    };
    return parsed.post_id === postId && parsed.user === userAddress;
  });

  // If no events, not bookmarked
  if (userBookmarkEvents.length === 0 && userUnbookmarkEvents.length === 0) {
    return false;
  }

  // Get most recent event timestamps
  const bookmarkTimestamps = userBookmarkEvents.map((e) =>
    Number(e.timestampMs || 0)
  );
  const unbookmarkTimestamps = userUnbookmarkEvents.map((e) =>
    Number(e.timestampMs || 0)
  );

  const latestBookmarkTime =
    bookmarkTimestamps.length > 0 ? Math.max(...bookmarkTimestamps) : 0;
  const latestUnbookmarkTime =
    unbookmarkTimestamps.length > 0 ? Math.max(...unbookmarkTimestamps) : 0;

  // If only bookmark events exist, it's bookmarked
  if (latestBookmarkTime > 0 && latestUnbookmarkTime === 0) {
    return true;
  }

  // If only unbookmark events exist, it's not bookmarked
  if (latestBookmarkTime === 0 && latestUnbookmarkTime > 0) {
    return false;
  }

  // Both exist - check which is more recent
  return latestBookmarkTime > latestUnbookmarkTime;
}

// Hook to bookmark post
export function useBookmarkPost() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const bookmarkPost = (postId: string) => {
    if (!(registries?.profileRegistry && registries?.bookmarkRegistry)) {
      throw new Error("Registries not found");
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(registries.profileRegistry),
        tx.object(registries.bookmarkRegistry),
        tx.pure.id(postId),
      ],
      target: `${blogPackageId}::blog::bookmark_post`,
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
              queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
              queryClient.invalidateQueries({ queryKey: ["is-bookmarked"] });
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

  return { bookmarkPost, isPending, error };
}

// Hook to unbookmark post
export function useUnbookmarkPost() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const unbookmarkPost = (postId: string) => {
    if (!registries?.bookmarkRegistry) {
      throw new Error("Bookmark registry not found");
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [tx.object(registries.bookmarkRegistry), tx.pure.id(postId)],
      target: `${blogPackageId}::blog::unbookmark_post`,
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
              queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
              queryClient.invalidateQueries({ queryKey: ["is-bookmarked"] });
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

  return { unbookmarkPost, isPending, error };
}

// Hook to check if a post is bookmarked by a user
export function useIsBookmarked(
  postId: string | undefined,
  userAddress: string | undefined
) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["is-bookmarked", postId, userAddress, blogPackageId],
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

      try {
        return await checkBookmarkStatus(
          suiClient,
          blogPackageId,
          postId,
          userAddress
        );
      } catch {
        return false;
      }
    },
    enabled: !!postId && !!userAddress && !!blogPackageId,
  });
}

// Hook to get bookmarks for a user
export function useBookmarks(userAddress: string | undefined) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["bookmarks", userAddress, blogPackageId],
    queryFn: async () => {
      if (!userAddress) {
        return [];
      }
      if (!blogPackageId) {
        return [];
      }

      try {
        const postBookmarkedType = `${blogPackageId}::blog::PostBookmarked`;

        // Query all PostBookmarked events
        const events = await suiClient.queryEvents({
          query: { MoveEventType: postBookmarkedType },
          limit: 1000,
          order: "descending",
        });

        // Filter bookmarks for this user
        const userBookmarks = events.data
          .map((event) => {
            const parsed = event.parsedJson as {
              post_id: string;
              user: string;
            };
            return parsed.user === userAddress ? parsed.post_id : null;
          })
          .filter(Boolean) as string[];

        // Remove duplicates and get unique post IDs
        const uniquePostIds = Array.from(new Set(userBookmarks));

        // Check for unbookmarked posts
        const postUnbookmarkedType = `${blogPackageId}::blog::PostUnbookmarked`;
        const unbookmarkEvents = await suiClient.queryEvents({
          query: { MoveEventType: postUnbookmarkedType },
          limit: 1000,
          order: "descending",
        });

        const unbookmarkedIds = new Set(
          unbookmarkEvents.data
            .map((event) => {
              const parsed = event.parsedJson as {
                post_id: string;
                user: string;
              };
              return parsed.user === userAddress ? parsed.post_id : null;
            })
            .filter(Boolean) as string[]
        );

        // Filter out unbookmarked posts
        const activeBookmarkIds = uniquePostIds.filter(
          (id) => !unbookmarkedIds.has(id)
        );

        // Fetch post objects
        const posts = await fetchPostObjects(suiClient, activeBookmarkIds);

        // Sort by createdAt descending (newest first)
        return posts.sort((a, b) => b.createdAt - a.createdAt);
      } catch {
        return [];
      }
    },
    enabled: !!userAddress && !!blogPackageId,
  });
}
