import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { PostCard } from "./PostCard";

type Post = {
  id: string;
  author: string;
  authorName?: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  likeCount?: number;
  commentCount?: number;
};

type PostListProps = {
  posts: Post[];
  isOwner?: (author: string) => boolean;
  onDelete?: (postId: string) => void;
  emptyMessage?: string;
};

export function PostList({
  posts,
  isOwner,
  onDelete,
  emptyMessage = "No posts yet. Be the first to post!",
}: PostListProps) {
  if (posts.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyTitle>No posts</EmptyTitle>
        <EmptyDescription>{emptyMessage}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="space-y-0">
      {posts.map((post) => (
        <PostCard
          author={post.author}
          authorName={post.authorName}
          commentCount={post.commentCount}
          content={post.content}
          createdAt={post.createdAt}
          isOwner={isOwner?.(post.author) ?? false}
          key={post.id}
          likeCount={post.likeCount}
          onDelete={onDelete ? () => onDelete(post.id) : undefined}
          postId={post.id}
          title={post.title}
          updatedAt={post.updatedAt}
        />
      ))}
    </div>
  );
}
