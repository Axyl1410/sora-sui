import { Empty } from "@/components/ui/empty";
import { PostCard } from "./PostCard";

interface Post {
  id: string;
  author: string;
  authorName?: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface PostListProps {
  posts: Post[];
  isOwner?: (author: string) => boolean;
  onDelete?: (postId: string) => void;
  emptyMessage?: string;
}

export function PostList({
  posts,
  isOwner,
  onDelete,
  emptyMessage = "No posts yet. Be the first to post!",
}: PostListProps) {
  if (posts.length === 0) {
    return (
      <Empty className="py-12" description={emptyMessage} title="No posts" />
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          author={post.author}
          authorName={post.authorName}
          content={post.content}
          createdAt={post.createdAt}
          isOwner={isOwner?.(post.author) ?? false}
          key={post.id}
          onDelete={onDelete ? () => onDelete(post.id) : undefined}
          postId={post.id}
          title={post.title}
          updatedAt={post.updatedAt}
        />
      ))}
    </div>
  );
}
