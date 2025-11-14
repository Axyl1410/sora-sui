import {
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNetworkVariable } from "@/networkConfig";
import { parseMoveError } from "../error-handling";
import { fetchPostObjects } from "../helpers";
import { parsePost } from "../parsers";
import { useBlogRegistries } from "../registries";

// Hook to get posts from events
export function usePosts(limit = 50) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["posts", blogPackageId, limit],
    queryFn: async () => {
      const postCreatedType = `${blogPackageId}::blog::PostCreated`;

      // Query events
      const events = await suiClient.queryEvents({
        query: { MoveEventType: postCreatedType },
        limit,
        order: "descending",
      });

      // Get post objects
      const postIds = events.data
        .map((event) => {
          const parsed = event.parsedJson as {
            post_id: string;
            author: string;
            title: string;
          };
          return parsed.post_id;
        })
        .filter(Boolean);

      // Fetch all post objects
      const posts = await fetchPostObjects(suiClient, postIds);

      // Sort by createdAt descending
      return posts.sort((a, b) => b.createdAt - a.createdAt);
    },
    enabled: !!blogPackageId,
    refetchInterval: 10_000, // Refetch every 10 seconds
  });
}

// Hook to get posts by author
export function useAuthorPosts(author: string | undefined) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["author-posts", author, blogPackageId],
    queryFn: async () => {
      if (!author) {
        return [];
      }

      const postCreatedType = `${blogPackageId}::blog::PostCreated`;

      // Query events filtered by author
      const events = await suiClient.queryEvents({
        query: {
          MoveEventType: postCreatedType,
          // Note: Event filtering by author might need custom logic
        },
        limit: 100,
        order: "descending",
      });

      // Filter by author and get posts
      const authorEvents = events.data.filter((event) => {
        const parsed = event.parsedJson as { author: string };
        return parsed.author === author;
      });

      const postIds = authorEvents
        .map((event) => {
          const parsed = event.parsedJson as { post_id: string };
          return parsed.post_id;
        })
        .filter(Boolean);

      const posts = await fetchPostObjects(suiClient, postIds);

      return posts
        .filter((post) => post.author === author)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    enabled: !!author && !!blogPackageId,
  });
}

// Hook to get single post
export function usePost(postId: string | undefined) {
  return useSuiClientQuery(
    "getObject",
    {
      id: postId ?? "",
      options: {
        showContent: true,
        showOwner: true,
      },
    },
    {
      enabled: !!postId,
      select: (data) => {
        if (!data.data) {
          return null;
        }
        return parsePost(data.data);
      },
    }
  );
}

// Hook to create post
export function useCreatePost() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);

  const createPost = (title: string, content: string) => {
    if (!(registries?.profileRegistry && registries?.postRegistry)) {
      throw new Error("Registries not found");
    }

    setError(null);

    const tx = new Transaction();
    const clockId = "0x6";

    tx.moveCall({
      arguments: [
        tx.object(registries.profileRegistry),
        tx.object(registries.postRegistry),
        tx.pure.string(title),
        tx.pure.string(content),
        tx.object(clockId),
      ],
      target: `${blogPackageId}::blog::create_post`,
    });

    return new Promise<string>((resolve, reject) => {
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async ({ digest }) => {
            try {
              await suiClient.waitForTransaction({ digest });
              const txData = await suiClient.getTransactionBlock({
                digest,
                options: { showEvents: true },
              });

              const postCreatedEvent = txData.events?.find((e) =>
                e.type.includes("PostCreated")
              );

              if (postCreatedEvent) {
                const parsed = postCreatedEvent.parsedJson as {
                  post_id: string;
                };
                resolve(parsed.post_id);
              } else {
                reject(new Error("Post created but event not found"));
              }
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

  return { createPost, isPending, error };
}

// Hook to update post
export function useUpdatePost() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [error, setError] = useState<string | null>(null);

  const updatePost = (postId: string, title: string, content: string) => {
    setError(null);

    const tx = new Transaction();
    const clockId = "0x6";

    tx.moveCall({
      arguments: [
        tx.object(postId),
        tx.pure.string(title),
        tx.pure.string(content),
        tx.object(clockId),
      ],
      target: `${blogPackageId}::blog::update_post`,
    });

    return new Promise<void>((resolve, reject) => {
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: ({ digest }) => {
            suiClient
              .waitForTransaction({ digest })
              .then(() => {
                resolve();
              })
              .catch((err) => {
                reject(err);
              });
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

  return { updatePost, isPending, error };
}

// Hook to delete post
export function useDeletePost() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);

  const deletePost = (postId: string) => {
    if (!registries?.postRegistry) {
      throw new Error("Post registry not found");
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [tx.object(registries.postRegistry), tx.object(postId)],
      target: `${blogPackageId}::blog::delete_post`,
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

  return { deletePost, isPending, error };
}
