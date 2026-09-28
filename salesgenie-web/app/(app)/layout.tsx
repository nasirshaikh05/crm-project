// app/(app)/layout.tsx

import type { ReactNode } from "react";
import TopNav from "@/app/components/TopNav";
import AuthGuard from "./components/AuthGuard";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen flex-col overflow-hidden bg-[#F8F9FB]">
        {/* Top Navigation */}
        <TopNav />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto h-full w-full p-6">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
