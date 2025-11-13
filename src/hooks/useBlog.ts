import {
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import type {
  SuiClient,
  SuiObjectData,
  SuiObjectResponse,
} from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  14: "You have already liked this post",
  15: "You have not liked this post",
  16: "You are already following this user",
  17: "You are not following this user",
  18: "You cannot follow yourself",
  19: "Comment must be at least 1 character",
  20: "Comment must be less than 1000 characters",
  21: "Comment not found",
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
  followerCount: number;
  followingCount: number;
  pinnedPostId?: string | null;
};

export type Post = {
  id: string;
  author: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  likeCount: number;
  commentCount: number;
};

export type Comment = {
  id: string;
  postId: string;
  author: string;
  content: string;
  parentCommentId?: string | null;
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
    follower_count?: string;
    following_count?: string;
    pinned_post_id?: { vec: string[] } | null;
  };

  return {
    id: data.objectId,
    owner: fields.owner,
    name: fields.name,
    bio: fields.bio,
    createdAt: Number(fields.created_at),
    updatedAt: Number(fields.updated_at),
    followerCount: fields.follower_count ? Number(fields.follower_count) : 0,
    followingCount: fields.following_count ? Number(fields.following_count) : 0,
    pinnedPostId: fields.pinned_post_id?.vec?.[0] || null,
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
    like_count?: string;
    comment_count?: string;
  };

  return {
    id: data.objectId,
    author: fields.author,
    title: fields.title,
    content: fields.content,
    createdAt: Number(fields.created_at),
    updatedAt: Number(fields.updated_at),
    likeCount: fields.like_count ? Number(fields.like_count) : 0,
    commentCount: fields.comment_count ? Number(fields.comment_count) : 0,
  };
}

// Registry configuration
// After deploying the blog contract, update these IDs in .env file:
// VITE_PROFILE_REGISTRY_ID=0x...
// VITE_POST_REGISTRY_ID=0x...

const PROFILE_REGISTRY_ID = import.meta.env.VITE_PROFILE_REGISTRY_ID || "";
const POST_REGISTRY_ID = import.meta.env.VITE_POST_REGISTRY_ID || "";
const LIKE_REGISTRY_ID = import.meta.env.VITE_LIKE_REGISTRY_ID || "";
const FOLLOW_REGISTRY_ID = import.meta.env.VITE_FOLLOW_REGISTRY_ID || "";
const COMMENT_REGISTRY_ID = import.meta.env.VITE_COMMENT_REGISTRY_ID || "";
const BOOKMARK_REGISTRY_ID = import.meta.env.VITE_BOOKMARK_REGISTRY_ID || "";

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
          likeRegistry: LIKE_REGISTRY_ID || null,
          followRegistry: FOLLOW_REGISTRY_ID || null,
          commentRegistry: COMMENT_REGISTRY_ID || null,
          bookmarkRegistry: BOOKMARK_REGISTRY_ID || null,
        });
      }

      // Otherwise return null - user needs to set registry IDs
      return Promise.resolve({
        profileRegistry: null,
        postRegistry: null,
        likeRegistry: null,
        followRegistry: null,
        commentRegistry: null,
        bookmarkRegistry: null,
      });
    },
    staleTime: Number.POSITIVE_INFINITY, // Registry IDs don't change
  });
}

// Helper function to extract unique profile IDs from events
function extractUniqueProfileIds(events: unknown[]): string[] {
  const profileIdMap = new Map<string, string>();
  for (const event of events) {
    const parsed = event as {
      parsedJson?: {
        profile_id: string;
        owner: string;
      };
    };
    if (parsed.parsedJson) {
      const { owner, profile_id } = parsed.parsedJson;
      // Use owner as key to ensure uniqueness (one profile per address)
      if (!profileIdMap.has(owner)) {
        profileIdMap.set(owner, profile_id);
      }
    }
  }
  return Array.from(profileIdMap.values());
}

// Helper function to fetch profile objects
async function fetchProfileObjects(
  suiClient: SuiClient,
  profileIds: string[]
): Promise<Profile[]> {
  const profilesData = await Promise.all(
    profileIds.map((id) =>
      suiClient
        .getObject({
          id,
          options: { showContent: true, showOwner: true },
        })
        .then((res: SuiObjectResponse) => res.data ?? null)
        .catch(() => null)
    )
  );

  const profiles: Profile[] = [];
  for (const data of profilesData) {
    if (data) {
      const profile = parseProfile(data);
      if (profile) {
        profiles.push(profile);
      }
    }
  }
  return profiles;
}

// Hook to get all profiles
export function useAllProfiles(limit = 100) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["all-profiles", blogPackageId, limit],
    queryFn: async () => {
      try {
        const profileCreatedType = `${blogPackageId}::blog::ProfileCreated`;

        // Query all ProfileCreated events
        const events = await suiClient.queryEvents({
          query: { MoveEventType: profileCreatedType },
          limit,
          order: "descending",
        });

        // Extract unique profile IDs
        const profileIds = extractUniqueProfileIds(events.data);

        // Fetch all profile objects
        const profiles = await fetchProfileObjects(suiClient, profileIds);

        // Sort by createdAt descending
        return profiles.sort((a, b) => b.createdAt - a.createdAt);
      } catch {
        return [];
      }
    },
    enabled: !!blogPackageId,
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

// Hook to update profile name
export function useUpdateProfileName() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [error, setError] = useState<string | null>(null);

  const updateProfileName = (profileId: string, name: string) => {
    setError(null);

    const tx = new Transaction();
    const clockId = "0x6";

    tx.moveCall({
      arguments: [
        tx.object(profileId),
        tx.pure.string(name),
        tx.object(clockId),
      ],
      target: `${blogPackageId}::blog::update_profile_name`,
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

  return { updateProfileName, isPending, error };
}

// Hook to update profile bio
export function useUpdateProfileBio() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [error, setError] = useState<string | null>(null);

  const updateProfileBio = (profileId: string, bio: string) => {
    setError(null);

    const tx = new Transaction();
    const clockId = "0x6";

    tx.moveCall({
      arguments: [
        tx.object(profileId),
        tx.pure.string(bio),
        tx.object(clockId),
      ],
      target: `${blogPackageId}::blog::update_profile_bio`,
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

  return { updateProfileBio, isPending, error };
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

// Hook to pin post
export function usePinPost() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const pinPost = (profileId: string, postId: string) => {
    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [tx.object(profileId), tx.object(postId)],
      target: `${blogPackageId}::blog::pin_post`,
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

  return { pinPost, isPending, error };
}

// Hook to unpin post
export function useUnpinPost() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const unpinPost = (profileId: string) => {
    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [tx.object(profileId)],
      target: `${blogPackageId}::blog::unpin_post`,
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

  return { unpinPost, isPending, error };
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
          if (!data) {
            continue;
          }
          if (data.content?.dataType === "moveObject") {
            const fields = data.content.fields as {
              post_id: string;
              author: string;
              content: string;
              parent_comment_id?: { vec: string[] } | null;
              created_at: string;
              updated_at: string;
            };

            comments.push({
              id: data.objectId,
              postId: fields.post_id,
              author: fields.author,
              content: fields.content,
              parentCommentId: fields.parent_comment_id?.vec?.[0] || null,
              createdAt: Number(fields.created_at),
              updatedAt: Number(fields.updated_at),
            });
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
        const postsData = await Promise.all(
          activeBookmarkIds.map((id) =>
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

        // Sort by createdAt descending (newest first)
        return posts.sort((a, b) => b.createdAt - a.createdAt);
      } catch {
        return [];
      }
    },
    enabled: !!userAddress && !!blogPackageId,
  });
}

// Hook to get pinned post for a profile
export function usePinnedPost(profileId: string | undefined) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["pinned-post", profileId],
    queryFn: async () => {
      if (!profileId) {
        return null;
      }

      try {
        const profileData = await suiClient.getObject({
          id: profileId,
          options: { showContent: true },
        });

        if (profileData.data?.content?.dataType !== "moveObject") {
          return null;
        }

        const fields = (
          profileData.data.content as { dataType: string; fields: unknown }
        ).fields as {
          pinned_post_id?: { vec: string[] } | null;
        };

        const pinnedPostId = fields.pinned_post_id?.vec?.[0];
        if (!pinnedPostId) {
          return null;
        }

        // Fetch pinned post
        const postData = await suiClient.getObject({
          id: pinnedPostId,
          options: { showContent: true, showOwner: true },
        });

        if (!postData.data) {
          return null;
        }

        return parsePost(postData.data);
      } catch {
        return null;
      }
    },
    enabled: !!profileId,
  });
}

// Hook to delete profile
export function useDeleteProfile() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deleteProfile = (profileId: string) => {
    if (!registries?.profileRegistry) {
      throw new Error("Profile registry not found");
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [tx.object(registries.profileRegistry), tx.object(profileId)],
      target: `${blogPackageId}::blog::delete_profile`,
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
              queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
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

  return { deleteProfile, isPending, error };
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
        const postsData = await Promise.all(
          activeLikeIds.map((id) =>
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

        // Sort by createdAt descending (newest first)
        return posts.sort((a, b) => b.createdAt - a.createdAt);
      } catch {
        return [];
      }
    },
    enabled: !!userAddress && !!blogPackageId,
  });
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
          if (!data) {
            continue;
          }
          if (data.content?.dataType === "moveObject") {
            const fields = data.content.fields as {
              post_id: string;
              author: string;
              content: string;
              parent_comment_id?: { vec: string[] } | null;
              created_at: string;
              updated_at: string;
            };

            comments.push({
              id: data.objectId,
              postId: fields.post_id,
              author: fields.author,
              content: fields.content,
              parentCommentId: fields.parent_comment_id?.vec?.[0] || null,
              createdAt: Number(fields.created_at),
              updatedAt: Number(fields.updated_at),
            });
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
