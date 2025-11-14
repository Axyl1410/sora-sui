import type { SuiObjectData } from "@mysten/sui/client";
import type { Comment, Post, Profile } from "./types";

export function parseProfile(data: SuiObjectData): Profile | null {
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

export function parsePost(data: SuiObjectData): Post | null {
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

export function parseComment(data: SuiObjectData): Comment | null {
  if (data.content?.dataType !== "moveObject") {
    return null;
  }

  const fields = data.content.fields as {
    post_id: string;
    author: string;
    content: string;
    parent_comment_id?: { vec: string[] } | null;
    created_at: string;
    updated_at: string;
  };

  return {
    id: data.objectId,
    postId: fields.post_id,
    author: fields.author,
    content: fields.content,
    parentCommentId: fields.parent_comment_id?.vec?.[0] || null,
    createdAt: Number(fields.created_at),
    updatedAt: Number(fields.updated_at),
  };
}
