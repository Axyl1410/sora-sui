// Types for blog-related data structures
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
