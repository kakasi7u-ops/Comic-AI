"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import Header from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardSkeleton } from "@/components/ui/skeletons";

/**
 * Protected layout — wraps all authenticated routes.
 *
 * On mount: hydrates auth state from localStorage via GET /api/v1/auth/me.
 * If user is not authenticated after hydration → redirects to /login.
 * No silent failures: if /me errors, user is cleared and redirected.
 */
export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const { user, isLoading, hydrate } = useAuthStore();

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    useEffect(() => {
        // After hydration completes, if no user → redirect to login
        if (!isLoading && user === null) {
            router.replace("/login");
        }
    }, [isLoading, user, router]);

    // Show skeleton while hydrating session
    if (isLoading || user === null) {
        return (
            <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900">
                <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50">
                    <Sidebar />
                </aside>
                <main className="flex-1 md:ml-72 flex flex-col h-full overflow-hidden">
                    <Header />
                    <div className="flex-1 overflow-y-auto p-8">
                        <DashboardSkeleton />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50">
                <Sidebar />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-72 flex flex-col h-full overflow-hidden">
                <Header />
                <div className="flex-1 overflow-y-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
