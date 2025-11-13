import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { ProfileCard } from "./ProfileCard";

type Profile = {
  id: string;
  owner: string;
  name?: string;
  bio?: string;
  createdAt?: number;
  updatedAt?: number;
};

type ProfileListProps = {
  profiles: Profile[];
  emptyMessage?: string;
};

export function ProfileList({
  profiles,
  emptyMessage = "No profiles found.",
}: ProfileListProps) {
  if (profiles.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyTitle>No profiles</EmptyTitle>
        <EmptyDescription>{emptyMessage}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {profiles.map((profile) => (
        <ProfileCard
          address={profile.owner}
          bio={profile.bio}
          createdAt={profile.createdAt}
          key={profile.id}
          name={profile.name}
        />
      ))}
    </div>
  );
}
