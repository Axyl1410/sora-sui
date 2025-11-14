import type { SuiClient, SuiObjectResponse } from "@mysten/sui/client";
import { parsePost, parseProfile } from "./parsers";
import type { Post, Profile } from "./types";

// Helper function to extract unique profile IDs from events
export function extractUniqueProfileIds(events: unknown[]): string[] {
  const profileIdMap = new Map<string, string>();
  for (const event of events) {
    const parsed = event as {
      parsedJson?: {
        profile_id: string;
        owner: string;
      };
    };
    if (parsed.parsedJson) {
      const { owner, profile_id } = parsed.parsedJson;
      // Use owner as key to ensure uniqueness (one profile per address)
      if (!profileIdMap.has(owner)) {
        profileIdMap.set(owner, profile_id);
      }
    }
  }
  return Array.from(profileIdMap.values());
}

// Helper function to fetch profile objects
export async function fetchProfileObjects(
  suiClient: SuiClient,
  profileIds: string[]
): Promise<Profile[]> {
  const profilesData = await Promise.all(
    profileIds.map((id) =>
      suiClient
        .getObject({
          id,
          options: { showContent: true, showOwner: true },
        })
        .then((res: SuiObjectResponse) => res.data ?? null)
        .catch(() => null)
    )
  );

  const profiles: Profile[] = [];
  for (const data of profilesData) {
    if (data) {
      const profile = parseProfile(data);
      if (profile) {
        profiles.push(profile);
      }
    }
  }
  return profiles;
}

// Helper function to fetch post objects
export async function fetchPostObjects(
  suiClient: SuiClient,
  postIds: string[]
): Promise<Post[]> {
  const postsData = await Promise.all(
    postIds.map((id) =>
      suiClient
        .getObject({
          id,
          options: { showContent: true, showOwner: true },
        })
        .then((res) => res.data)
        .catch(() => null)
    )
  );

  const posts: Post[] = [];
  for (const data of postsData) {
    if (data) {
      const post = parsePost(data);
      if (post) {
        posts.push(post);
      }
    }
  }
  return posts;
}
