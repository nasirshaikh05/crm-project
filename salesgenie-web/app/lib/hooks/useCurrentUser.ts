"use client";

import { useCallback, useEffect, useState } from "react";
import { usersApi, type ApiError } from "@/app/lib/api";
import type { UpdateUserPayload, UserProfile } from "@/app/lib/api/types";
import { updateSessionProfile } from "@/app/lib/auth/session";

/** `enabled` defaults to true; pass false to skip fetching until the
 *  caller is actually ready for it (e.g. a settings drawer that's mounted
 *  up-front so its close animation works, but shouldn't fetch before
 *  it's opened — see SettingsPanel). */
export function useCurrentUser(enabled: boolean = true) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.getMe();
      setProfile(data);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [enabled, refetch]);

  // Keeps the session copy (and TopNav's name/initials, via the
  // "user:updated" event it listens for) in sync with any edit made here.
  const updateProfile = useCallback(async (payload: UpdateUserPayload) => {
    const updated = await usersApi.updateMe(payload);
    setProfile(updated);
    updateSessionProfile(updated.firstName, updated.lastName, updated.email);
    window.dispatchEvent(new Event("user:updated"));
    return updated;
  }, []);

  return { profile, loading, error, refetch, updateProfile };
}
