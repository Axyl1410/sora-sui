import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNetworkVariable } from "@/networkConfig";
import { parseMoveError } from "../error-handling";
import { extractUniqueProfileIds, fetchProfileObjects } from "../helpers";
import { parseProfile } from "../parsers";
import { useBlogRegistries } from "../registries";

// Hook to get all profiles
export function useAllProfiles(limit = 100) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["all-profiles", blogPackageId, limit],
    queryFn: async () => {
      try {
        const profileCreatedType = `${blogPackageId}::blog::ProfileCreated`;

        // Query all ProfileCreated events
        const events = await suiClient.queryEvents({
          query: { MoveEventType: profileCreatedType },
          limit,
          order: "descending",
        });

        // Extract unique profile IDs
        const profileIds = extractUniqueProfileIds(events.data);

        // Fetch all profile objects
        const profiles = await fetchProfileObjects(suiClient, profileIds);

        // Sort by createdAt descending
        return profiles.sort((a, b) => b.createdAt - a.createdAt);
      } catch {
        return [];
      }
    },
    enabled: !!blogPackageId,
  });
}

// Hook to get profile by address
export function useProfile(address: string | undefined) {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { data: registries } = useBlogRegistries();

  return useQuery({
    queryKey: ["profile", address, registries?.profileRegistry],
    queryFn: async () => {
      if (!(address && registries?.profileRegistry)) {
        return null;
      }

      try {
        // Query ProfileCreated events to find profile
        // Note: Using events is reliable since each address can only have one profile
        const profileCreatedType = `${blogPackageId}::blog::ProfileCreated`;

        const events = await suiClient.queryEvents({
          query: { MoveEventType: profileCreatedType },
          limit: 100,
          order: "descending",
        });

        // Find the most recent profile created event for this address
        const profileEvent = events.data.find((event) => {
          const parsed = event.parsedJson as { owner: string };
          return parsed.owner === address;
        });

        if (!profileEvent) {
          return null;
        }

        const parsed = profileEvent.parsedJson as { profile_id: string };
        const profileId = parsed.profile_id;

        // Get profile object
        const profileData = await suiClient.getObject({
          id: profileId,
          options: { showContent: true, showOwner: true },
        });

        if (!profileData.data) {
          return null;
        }

        return parseProfile(profileData.data);
      } catch {
        return null;
      }
    },
    enabled: !!address && !!registries?.profileRegistry,
  });
}

// Hook to create profile
export function useCreateProfile() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);

  const createProfile = (name: string, bio: string) => {
    if (!registries?.profileRegistry) {
      throw new Error("Registry not found");
    }

    setError(null);

    const tx = new Transaction();

    // Get Clock object (shared object)
    const clockId = "0x6"; // Clock is a well-known shared object

    tx.moveCall({
      arguments: [
        tx.object(registries.profileRegistry),
        tx.pure.string(name),
        tx.pure.string(bio),
        tx.object(clockId),
      ],
      target: `${blogPackageId}::blog::create_profile`,
    });

    return new Promise<string>((resolve, reject) => {
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async ({ digest }) => {
            try {
              await suiClient.waitForTransaction({ digest });
              // Get profile ID from events
              const txData = await suiClient.getTransactionBlock({
                digest,
                options: { showEvents: true },
              });

              const profileCreatedEvent = txData.events?.find((e) =>
                e.type.includes("ProfileCreated")
              );

              if (profileCreatedEvent) {
                const parsed = profileCreatedEvent.parsedJson as {
                  profile_id: string;
                };
                resolve(parsed.profile_id);
              } else {
                reject(new Error("Profile created but event not found"));
              }
            } catch (err) {
              reject(err);
            }
          },
          onError: (err) => {
            const errorMessage = parseMoveError(err);
            setError(errorMessage);
            reject(new Error(errorMessage));
          },
        }
      );
    });
  };

  return { createProfile, isPending, error };
}

// Hook to update profile name
export function useUpdateProfileName() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [error, setError] = useState<string | null>(null);

  const updateProfileName = (profileId: string, name: string) => {
    setError(null);

    const tx = new Transaction();
    const clockId = "0x6";

    tx.moveCall({
      arguments: [
        tx.object(profileId),
        tx.pure.string(name),
        tx.object(clockId),
      ],
      target: `${blogPackageId}::blog::update_profile_name`,
    });

    return new Promise<void>((resolve, reject) => {
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: ({ digest }) => {
            suiClient
              .waitForTransaction({ digest })
              .then(() => {
                resolve();
              })
              .catch((err) => {
                reject(err);
              });
          },
          onError: (err) => {
            const errorMessage = parseMoveError(err);
            setError(errorMessage);
            reject(new Error(errorMessage));
          },
        }
      );
    });
  };

  return { updateProfileName, isPending, error };
}

// Hook to update profile bio
export function useUpdateProfileBio() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const [error, setError] = useState<string | null>(null);

  const updateProfileBio = (profileId: string, bio: string) => {
    setError(null);

    const tx = new Transaction();
    const clockId = "0x6";

    tx.moveCall({
      arguments: [
        tx.object(profileId),
        tx.pure.string(bio),
        tx.object(clockId),
      ],
      target: `${blogPackageId}::blog::update_profile_bio`,
    });

    return new Promise<void>((resolve, reject) => {
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: ({ digest }) => {
            suiClient
              .waitForTransaction({ digest })
              .then(() => {
                resolve();
              })
              .catch((err) => {
                reject(err);
              });
          },
          onError: (err) => {
            const errorMessage = parseMoveError(err);
            setError(errorMessage);
            reject(new Error(errorMessage));
          },
        }
      );
    });
  };

  return { updateProfileBio, isPending, error };
}

// Hook to delete profile
export function useDeleteProfile() {
  const blogPackageId = useNetworkVariable("blogPackageId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: registries } = useBlogRegistries();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deleteProfile = (profileId: string) => {
    if (!registries?.profileRegistry) {
      throw new Error("Profile registry not found");
    }

    setError(null);

    const tx = new Transaction();

    tx.moveCall({
      arguments: [tx.object(registries.profileRegistry), tx.object(profileId)],
      target: `${blogPackageId}::blog::delete_profile`,
    });

    return new Promise<void>((resolve, reject) => {
      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async ({ digest }) => {
            try {
              await suiClient.waitForTransaction({ digest });
              queryClient.invalidateQueries({ queryKey: ["profile"] });
              queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          onError: (err) => {
            const errorMessage = parseMoveError(err);
            setError(errorMessage);
            reject(new Error(errorMessage));
          },
        }
      );
    });
  };

  return { deleteProfile, isPending, error };
}
