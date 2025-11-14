import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNetworkVariable } from "@/networkConfig";
import { parseMoveError } from "../error-handling";
import { parseComment } from "../parsers";
import { useBlogRegistries } from "../registries";
import type { Comment } from "../types";

// Hook to create comment
export function useCreateComment() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createComment = (
    postId: string,
    content: string,
    parentCommentId?: string | null
  ) => {
    if (!(registries?.profileRegistry && registries?.commentRegistry)) {
      throw new Error("Registries not found");
    }

    setError(null);

    const tx = new Transaction();
    const clockId = "0x6";

    // Option<ID> in Move - Option is serialized as vector<ID>
    // Empty vector = None, vector with one element = Some(id)
    const parentCommentArg = parentCommentId
      ? tx.pure.vector("address", [parentCommentId])
      : tx.pure.vector("address", []);

    tx.moveCall({
      arguments: [
        tx.object(registries.profileRegistry),
        tx.object(postId),
        tx.object(registries.commentRegistry),
        tx.pure.string(content),
        parentCommentArg,
        tx.object(clockId),
      ],
      target: `${blogPackageId}::blog::create_comment`,
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

              const commentCreatedEvent = txData.events?.find((e) =>
                e.type.includes("CommentCreated")
              );

              if (commentCreatedEvent) {
                const parsed = commentCreatedEvent.parsedJson as {
                  comment_id: string;
                };
                queryClient.invalidateQueries({ queryKey: ["posts"] });
                queryClient.invalidateQueries({ queryKey: ["post", postId] });
                queryClient.invalidateQueries({
                  queryKey: ["comments", postId],
                });
                resolve(parsed.comment_id);
              } else {
                reject(new Error("Comment created but event not found"));
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

  return { createComment, isPending, error };
}

// Hook to get comments for a post
export function useComments(postId: string | undefined) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["comments", postId, blogPackageId],
    queryFn: async () => {
      if (!postId) {
        return [];
      }
      if (!blogPackageId) {
        return [];
      }

      try {
        const commentCreatedType = `${blogPackageId}::blog::CommentCreated`;
        const commentDeletedType = `${blogPackageId}::blog::CommentDeleted`;

        // Query all CommentCreated events
        const createdEvents = await suiClient.queryEvents({
          query: { MoveEventType: commentCreatedType },
          limit: 1000,
          order: "descending",
        });

        // Query all CommentDeleted events
        const deletedEvents = await suiClient.queryEvents({
          query: { MoveEventType: commentDeletedType },
          limit: 1000,
          order: "descending",
        });

        // Get set of deleted comment IDs
        const deletedCommentIds = new Set(
          deletedEvents.data
            .map((event) => {
              const parsed = event.parsedJson as {
                comment_id: string;
                post_id: string;
              };
              return parsed.post_id === postId ? parsed.comment_id : null;
            })
            .filter(Boolean) as string[]
        );

        // Filter comments for this post and exclude deleted ones
        const postComments = createdEvents.data
          .map((event) => {
            const parsed = event.parsedJson as {
              comment_id: string;
              post_id: string;
              author: string;
              parent_comment_id?: { vec: string[] } | null;
            };
            if (
              parsed.post_id === postId &&
              !deletedCommentIds.has(parsed.comment_id)
            ) {
              return parsed;
            }
            return null;
          })
          .filter(Boolean) as Array<{
          comment_id: string;
          post_id: string;
          author: string;
          parent_comment_id?: { vec: string[] } | null;
        }>;

        // Fetch comment objects
        const commentsData = await Promise.all(
          postComments.map((c) =>
            suiClient
              .getObject({
                id: c.comment_id,
                options: { showContent: true, showOwner: true },
              })
              .then((res) => res.data)
              .catch(() => null)
          )
        );

        const comments: Comment[] = [];
        for (const data of commentsData) {
          if (data) {
            const comment = parseComment(data);
            if (comment) {
              comments.push(comment);
            }
          }
        }

        // Sort by createdAt ascending (oldest first)
        return comments.sort((a, b) => a.createdAt - b.createdAt);
      } catch {
        return [];
      }
    },
    enabled: !!postId && !!blogPackageId,
  });
}

// Hook to update a comment
export function useUpdateComment() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updateComment = (commentId: string, newContent: string) => {
    setError(null);

    const tx = new Transaction();
    const clockId = "0x6";

    tx.moveCall({
      arguments: [
        tx.object(commentId),
        tx.pure.string(newContent),
        tx.object(clockId),
      ],
      target: `${blogPackageId}::blog::update_comment`,
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
              queryClient.invalidateQueries({ queryKey: ["comments"] });
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

  return { updateComment, isPending, error };
}

// Hook to delete a comment
export function useDeleteComment() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deleteComment = (postId: string, commentId: string) => {
    if (!registries?.commentRegistry) {
      throw new Error("Comment registry not found");
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(postId),
        tx.object(registries.commentRegistry),
        tx.object(commentId),
      ],
      target: `${blogPackageId}::blog::delete_comment`,
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
              queryClient.invalidateQueries({ queryKey: ["comments", postId] });
              queryClient.invalidateQueries({ queryKey: ["post", postId] });
              queryClient.invalidateQueries({ queryKey: ["posts"] });
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

  return { deleteComment, isPending, error };
}

// Hook to get comments by a user
export function useUserComments(userAddress: string | undefined) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["user-comments", userAddress, blogPackageId],
    queryFn: async () => {
      if (!userAddress) {
        return [];
      }
      if (!blogPackageId) {
        return [];
      }

      try {
        const commentCreatedType = `${blogPackageId}::blog::CommentCreated`;

        // Query all CommentCreated events
        const events = await suiClient.queryEvents({
          query: { MoveEventType: commentCreatedType },
          limit: 1000,
          order: "descending",
        });

        // Filter comments by this user
        const userComments = events.data
          .map((event) => {
            const parsed = event.parsedJson as {
              comment_id: string;
              post_id: string;
              author: string;
            };
            return parsed.author === userAddress ? parsed : null;
          })
          .filter(Boolean) as Array<{
          comment_id: string;
          post_id: string;
          author: string;
        }>;

        // Fetch comment objects
        const commentsData = await Promise.all(
          userComments.map((c) =>
            suiClient
              .getObject({
                id: c.comment_id,
                options: { showContent: true, showOwner: true },
              })
              .then((res) => res.data)
              .catch(() => null)
          )
        );

        const comments: Comment[] = [];
        for (const data of commentsData) {
          if (data) {
            const comment = parseComment(data);
            if (comment) {
              comments.push(comment);
            }
          }
        }

        // Sort by createdAt descending (newest first)
        return comments.sort((a, b) => b.createdAt - a.createdAt);
      } catch {
        return [];
      }
    },
    enabled: !!userAddress && !!blogPackageId,
  });
}
