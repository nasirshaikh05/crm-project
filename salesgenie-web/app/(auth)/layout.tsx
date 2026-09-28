import type { ReactNode } from "react";
import GuestGuard from "./components/GuestGuard";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <GuestGuard>
      <div className="h-screen w-screen overflow-hidden">{children}</div>
    </GuestGuard>
  );
}
