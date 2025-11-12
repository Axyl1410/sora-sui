import { useCurrentAccount } from "@mysten/dapp-kit";
import { Heading } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { CreatePostForm } from "@/components/CreatePostForm";
import { PostList } from "@/components/PostList";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const currentAccount = useCurrentAccount();

  // Mock data - sẽ được thay thế bằng data thật từ contract
  const mockPosts = [
    {
      id: "0x1",
      author: "0x1234567890abcdef1234567890abcdef12345678",
      authorName: "Alice",
      title: "Welcome to Sui Blog!",
      content:
        "This is my first post on the Sui blockchain. Excited to share my thoughts with everyone!",
      createdAt: Date.now() - 3_600_000, // 1 hour ago
      updatedAt: Date.now() - 3_600_000,
    },
    {
      id: "0x2",
      author: "0xabcdef1234567890abcdef1234567890abcdef12",
      authorName: "Bob",
      title: "Building on Sui",
      content:
        "Sui is an amazing blockchain platform. The object model makes it so intuitive to build dApps!",
      createdAt: Date.now() - 7_200_000, // 2 hours ago
      updatedAt: Date.now() - 7_200_000,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Heading size="8">Home</Heading>
      </div>

      {currentAccount && (
        <CreatePostForm
          onSubmit={(data) => {
            // TODO: Implement create post logic
            console.log("Creating post:", data);
          }}
        />
      )}

      <div>
        <Heading className="mb-4" size="6">
          Latest Posts
        </Heading>
        <PostList
          emptyMessage="No posts yet. Be the first to post!"
          isOwner={(author) => currentAccount?.address === author}
          posts={mockPosts}
        />
      </div>
    </div>
  );
}
