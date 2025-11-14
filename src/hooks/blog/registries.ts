import { useQuery } from "@tanstack/react-query";

const PROFILE_REGISTRY_ID = import.meta.env.VITE_PROFILE_REGISTRY_ID || "";
const POST_REGISTRY_ID = import.meta.env.VITE_POST_REGISTRY_ID || "";
const LIKE_REGISTRY_ID = import.meta.env.VITE_LIKE_REGISTRY_ID || "";
const FOLLOW_REGISTRY_ID = import.meta.env.VITE_FOLLOW_REGISTRY_ID || "";
const COMMENT_REGISTRY_ID = import.meta.env.VITE_COMMENT_REGISTRY_ID || "";
const BOOKMARK_REGISTRY_ID = import.meta.env.VITE_BOOKMARK_REGISTRY_ID || "";

export type BlogRegistries = {
  profileRegistry: string | null;
  postRegistry: string | null;
  likeRegistry: string | null;
  followRegistry: string | null;
  commentRegistry: string | null;
  bookmarkRegistry: string | null;
};

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
