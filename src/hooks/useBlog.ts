import {
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import type { SuiObjectData } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNetworkVariable } from "@/networkConfig";

// Error code mapping for better user messages
const ERROR_MESSAGES: Record<number, string> = {
  0: "Name must be at least 3 characters",
  1: "Name must be less than 50 characters",
  2: "Bio must be less than 200 characters",
  3: "Title must be at least 1 character",
  4: "Title must be less than 100 characters",
  5: "Content must be at least 1 character",
  6: "Content must be less than 10000 characters",
  7: "Profile already exists for this address",
  8: "Unauthorized: You don't have permission to perform this action",
  9: "Profile not found",
  10: "Profile ID mismatch",
  11: "Profile not found in registry",
  12: "Invalid input: Text cannot be only whitespace",
  13: "Post count desynchronized",
};

// Regex for extracting error codes from Move error messages
const MOVE_ABORT_REGEX = /MoveAbort\(.*?,\s*(\d+)\)/;

function extractErrorCode(message: string): number | null {
  const match = message.match(MOVE_ABORT_REGEX);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  return null;
}

function getErrorMessageFromCode(code: number): string | null {
  return ERROR_MESSAGES[code] || null;
}

function parseErrorFromString(errorMessage: string): string {
  const code = extractErrorCode(errorMessage);
  if (code !== null) {
    const message = getErrorMessageFromCode(code);
    if (message) {
      return message;
    }
  }
  return errorMessage;
}

function parseErrorFromObject(errorObj: {
  message?: string;
  code?: number;
}): string {
  if (typeof errorObj.code === "number") {
    const message = getErrorMessageFromCode(errorObj.code);
    if (message) {
      return message;
    }
  }

  if (errorObj.message) {
    return parseErrorFromString(errorObj.message);
  }

  return "An error occurred";
}

function parseMoveError(error: unknown): string {
  if (typeof error === "string") {
    return parseErrorFromString(error);
  }

  if (typeof error !== "object" || error === null) {
    return "An unknown error occurred";
  }

  return parseErrorFromObject(error as { message?: string; code?: number });
}

// Types
export type Profile = {
  id: string;
  owner: string;
  name: string;
  bio: string;
  createdAt: number;
  updatedAt: number;
};

export type Post = {
  id: string;
  author: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

// Helper functions to parse Sui objects
function parseProfile(data: SuiObjectData): Profile | null {
  if (data.content?.dataType !== "moveObject") {
    return null;
  }

  const fields = data.content.fields as {
    owner: string;
    name: string;
    bio: string;
    created_at: string;
    updated_at: string;
  };

  return {
    id: data.objectId,
    owner: fields.owner,
    name: fields.name,
    bio: fields.bio,
    createdAt: Number(fields.created_at),
    updatedAt: Number(fields.updated_at),
  };
}

function parsePost(data: SuiObjectData): Post | null {
  if (data.content?.dataType !== "moveObject") {
    return null;
  }

  const fields = data.content.fields as {
    author: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
  };

  return {
    id: data.objectId,
    author: fields.author,
    title: fields.title,
    content: fields.content,
    createdAt: Number(fields.created_at),
    updatedAt: Number(fields.updated_at),
  };
}

// Registry configuration
// After deploying the blog contract, update these IDs in .env file:
// VITE_PROFILE_REGISTRY_ID=0x...
// VITE_POST_REGISTRY_ID=0x...

const PROFILE_REGISTRY_ID = import.meta.env.VITE_PROFILE_REGISTRY_ID || "";
const POST_REGISTRY_ID = import.meta.env.VITE_POST_REGISTRY_ID || "";

// Hook to get registry objects
export function useBlogRegistries() {
  return useQuery({
    queryKey: ["blog-registries"],
    queryFn: () => {
      // If registry IDs are set, use them
      if (PROFILE_REGISTRY_ID && POST_REGISTRY_ID) {
        return Promise.resolve({
          profileRegistry: PROFILE_REGISTRY_ID,
          postRegistry: POST_REGISTRY_ID,
        });
      }

      // Otherwise return null - user needs to set registry IDs
      return Promise.resolve({
        profileRegistry: null,
        postRegistry: null,
      });
    },
    staleTime: Number.POSITIVE_INFINITY, // Registry IDs don't change
  });
}

// Hook to get profile by address
export function useProfile(address: string | undefined) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { data: registries } = useBlogRegistries();

  return useQuery({
    queryKey: ["profile", address, registries?.profileRegistry],
    queryFn: async () => {
      if (!(address && registries?.profileRegistry)) {
        return null;
      }

      try {
        // Query ProfileCreated events to find profile
        // Note: Using events is reliable since each address can only have one profile
        const profileCreatedType = `${blogPackageId}::blog::ProfileCreated`;

        const events = await suiClient.queryEvents({
          query: { MoveEventType: profileCreatedType },
          limit: 100,
          order: "descending",
        });

        // Find the most recent profile created event for this address
        const profileEvent = events.data.find((event) => {
          const parsed = event.parsedJson as { owner: string };
          return parsed.owner === address;
        });

        if (!profileEvent) {
          return null;
        }

        const parsed = profileEvent.parsedJson as { profile_id: string };
        const profileId = parsed.profile_id;

        // Get profile object
        const profileData = await suiClient.getObject({
          id: profileId,
          options: { showContent: true, showOwner: true },
        });

        if (!profileData.data) {
          return null;
        }

        return parseProfile(profileData.data);
      } catch {
        return null;
      }
    },
    enabled: !!address && !!registries?.profileRegistry,
  });
}

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
      const postsData = await Promise.all(
        postIds.map((id) =>
          suiClient
            .getObject({
              id,
              options: { showContent: true, showOwner: true },
            })
            .then((res) => res.data)
            .catch(() => null)
        )
      );

      const posts: Post[] = [];
      for (const data of postsData) {
        if (data) {
          const post = parsePost(data);
          if (post) {
            posts.push(post);
          }
        }
      }

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

      const postsData = await Promise.all(
        postIds.map((id) =>
          suiClient
            .getObject({
              id,
              options: { showContent: true, showOwner: true },
            })
            .then((res) => res.data)
            .catch(() => null)
        )
      );

      const posts: Post[] = [];
      for (const data of postsData) {
        if (data) {
          const post = parsePost(data);
          if (post && post.author === author) {
            posts.push(post);
          }
        }
      }

      return posts.sort((a, b) => b.createdAt - a.createdAt);
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

// Hook to create profile
export function useCreateProfile() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);

  const createProfile = (name: string, bio: string) => {
    if (!registries?.profileRegistry) {
      throw new Error("Registry not found");
    }

    setError(null);

    const tx = new Transaction();

    // Get Clock object (shared object)
    const clockId = "0x6"; // Clock is a well-known shared object

    tx.moveCall({
      arguments: [
        tx.object(registries.profileRegistry),
        tx.pure.string(name),
        tx.pure.string(bio),
        tx.object(clockId),
      ],
      target: `${blogPackageId}::blog::create_profile`,
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
              // Get profile ID from events
              const txData = await suiClient.getTransactionBlock({
                digest,
                options: { showEvents: true },
              });

              const profileCreatedEvent = txData.events?.find((e) =>
                e.type.includes("ProfileCreated")
              );

              if (profileCreatedEvent) {
                const parsed = profileCreatedEvent.parsedJson as {
                  profile_id: string;
                };
                resolve(parsed.profile_id);
              } else {
                reject(new Error("Profile created but event not found"));
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

  return { createProfile, isPending, error };
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
