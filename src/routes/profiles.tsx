import { createFileRoute } from "@tanstack/react-router";
import ClipLoader from "react-spinners/ClipLoader";
import { ProfileList } from "@/components/ProfileList";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAllProfiles } from "@/hooks/useBlog";

export const Route = createFileRoute("/profiles")({
  component: ProfilesPage,
});

function ProfilesPage() {
  const { data: profiles, isLoading, error } = useAllProfiles(100);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <ClipLoader size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">
          Error loading profiles: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-border border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="font-bold text-xl">All Profiles</h1>
          {profiles && profiles.length > 0 && (
            <span className="text-muted-foreground text-sm">
              ({profiles.length}{" "}
              {profiles.length === 1 ? "profile" : "profiles"})
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <ProfileList
          emptyMessage="No profiles found. Be the first to create a profile!"
          profiles={profiles ?? []}
        />
      </div>
    </div>
  );
}
