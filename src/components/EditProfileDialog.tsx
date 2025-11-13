import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateProfileBio, useUpdateProfileName } from "@/hooks/useBlog";

type EditProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  profileId: string;
  initialName: string;
  initialBio: string;
};

const MAX_NAME_LENGTH = 50;
const MAX_BIO_LENGTH = 200;
const MIN_NAME_LENGTH = 3;

export function EditProfileDialog({
  open,
  onOpenChange,
  onSuccess,
  profileId,
  initialName,
  initialBio,
}: EditProfileDialogProps) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const {
    updateProfileName,
    isPending: isUpdatingName,
    error: nameError,
  } = useUpdateProfileName();
  const {
    updateProfileBio,
    isPending: isUpdatingBio,
    error: bioError,
  } = useUpdateProfileBio();

  // Update form when initial values change
  useEffect(() => {
    setName(initialName);
    setBio(initialBio);
  }, [initialName, initialBio]);

  const isPending = isUpdatingName || isUpdatingBio;
  const hasChanges =
    name.trim() !== initialName.trim() || bio.trim() !== initialBio.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameTrimmed = name.trim();
    const bioTrimmed = bio.trim();

    // Validate name if changed
    if (nameTrimmed !== initialName.trim()) {
      if (nameTrimmed.length < MIN_NAME_LENGTH) {
        setError(`Name must be at least ${MIN_NAME_LENGTH} characters`);
        return;
      }

      if (nameTrimmed.length > MAX_NAME_LENGTH) {
        setError(`Name must be less than ${MAX_NAME_LENGTH} characters`);
        return;
      }
    }

    // Validate bio if changed
    if (
      bioTrimmed !== initialBio.trim() &&
      bioTrimmed.length > MAX_BIO_LENGTH
    ) {
      setError(`Bio must be less than ${MAX_BIO_LENGTH} characters`);
      return;
    }

    try {
      // Update name if changed
      if (nameTrimmed !== initialName.trim()) {
        await updateProfileName(profileId, nameTrimmed);
      }

      // Update bio if changed
      if (bioTrimmed !== initialBio.trim()) {
        await updateProfileBio(profileId, bioTrimmed);
      }

      // Only show success if something was actually updated
      if (hasChanges) {
        toast.success("Profile updated successfully!");
        // Invalidate profile queries to refetch updated data
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const displayError = error || nameError || bioError;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your profile information</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="edit-name">
                Name
              </label>
              <Input
                className="text-base"
                disabled={isPending}
                id="edit-name"
                maxLength={MAX_NAME_LENGTH}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                value={name}
              />
              <div className="flex justify-end text-muted-foreground text-xs">
                <span>
                  {name.length}/{MAX_NAME_LENGTH}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor="edit-bio">
                Bio (optional)
              </label>
              <Textarea
                className="min-h-24 resize-none text-base"
                disabled={isPending}
                id="edit-bio"
                maxLength={MAX_BIO_LENGTH}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself"
                value={bio}
              />
              <div className="flex justify-end text-muted-foreground text-xs">
                <span>
                  {bio.length}/{MAX_BIO_LENGTH}
                </span>
              </div>
            </div>

            {displayError && (
              <div className="text-destructive text-sm">{displayError}</div>
            )}

            <DialogFooter>
              <Button
                disabled={isPending}
                onClick={() => onOpenChange(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={isPending || !hasChanges || !name.trim()}
                type="submit"
              >
                {isPending ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
