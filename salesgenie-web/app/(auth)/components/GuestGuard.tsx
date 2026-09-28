"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/app/lib/auth/session";

export default function GuestGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/dashboard");
      return;
    }
    // Reading localStorage requires the client, so this can only run post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return <>{children}</>;
}
