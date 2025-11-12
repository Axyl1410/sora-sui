import { useCurrentAccount } from "@mysten/dapp-kit";
import { Heading } from "@radix-ui/themes";
import { createFileRoute } from "@tanstack/react-router";
import { PostList } from "@/components/PostList";
import { ProfileHeader } from "@/components/ProfileHeader";

export const Route = createFileRoute("/profile/$address")({
  component: ProfilePage,
});

function ProfilePage() {
  const currentAccount = useCurrentAccount();
  const { address } = Route.useParams();
  const isOwnProfile = currentAccount?.address === address;

  // Mock data - sẽ được thay thế bằng data thật từ contract
  const mockProfile = {
    address,
    name: "Alice",
    bio: "Blockchain enthusiast | Sui developer | Building the future of web3",
    postCount: 2,
    createdAt: Date.now() - 86_400_000 * 30, // 30 days ago
  };

  const mockPosts = [
    {
      id: "0x1",
      author: address,
      authorName: mockProfile.name,
      title: "Welcome to Sui Blog!",
      content:
        "This is my first post on the Sui blockchain. Excited to share my thoughts with everyone!",
      createdAt: Date.now() - 3_600_000,
      updatedAt: Date.now() - 3_600_000,
    },
    {
      id: "0x2",
      author: address,
      authorName: mockProfile.name,
      title: "Building on Sui",
      content:
        "Sui is an amazing blockchain platform. The object model makes it so intuitive to build dApps!",
      createdAt: Date.now() - 7_200_000,
      updatedAt: Date.now() - 7_200_000,
    },
  ].filter((post) => post.author === address);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <ProfileHeader
        address={address}
        bio={mockProfile.bio}
        createdAt={mockProfile.createdAt}
        isOwnProfile={isOwnProfile}
        name={mockProfile.name}
        postCount={mockProfile.postCount}
      />

      <div>
        <Heading className="mb-4" size="6">
          Posts
        </Heading>
        <PostList
          emptyMessage={
            isOwnProfile
              ? "You haven't posted anything yet. Create your first post!"
              : "This user hasn't posted anything yet."
          }
          isOwner={(author) => currentAccount?.address === author}
          posts={mockPosts}
        />
      </div>
    </div>
  );
}
