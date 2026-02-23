"use client";

import { Button } from "@/components/ui/button";
import { Layout, PenTool, CreditCard, Sparkles, ArrowRight, PlusCircle, ShieldAlert, ServerCrash } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProjectCard } from "@/components/dashboard/project-card";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi } from "@/lib/api/auth";
import { projectsApi, getProjectsErrorStatus } from "@/lib/api/projects";
import { profileApi } from "@/lib/api/profile";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import type { User, Project, Usage, UsageStats } from "@/lib/types/api";
import Link from "next/link";

// ─── Error state types ────────────────────────────────────────────────────────

type DashboardError =
    | { type: "auth" }       // 401 — redirect to login
    | { type: "forbidden" }  // 403 — permission error
    | { type: "server" }     // 500 / network — generic error

// ─── Error views ─────────────────────────────────────────────────────────────

function ForbiddenError() {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <ShieldAlert className="w-12 h-12 text-orange-400" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground max-w-sm">
                You don&apos;t have permission to view these projects. If this is unexpected, please contact support.
            </p>
        </div>
    );
}

function ServerError({ onRetry }: { onRetry: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
            <ServerCrash className="w-12 h-12 text-red-400" />
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground max-w-sm">
                We couldn&apos;t load your dashboard. This is likely a temporary issue.
            </p>
            <Button onClick={onRetry} variant="outline">
                Try Again
            </Button>
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyProjects() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/30 rounded-full flex items-center justify-center">
                <span className="text-4xl">🎨</span>
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight">No projects yet</h3>
                <p className="text-muted-foreground max-w-sm">
                    Your comic projects will appear here once you create them. Start your first story!
                </p>
            </div>
            <Link href="/create">
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-600">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Create Your First Comic
                </Button>
            </Link>
        </div>
    );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [usage, setUsage] = useState<Usage | null>(null);
    const [dashboardError, setDashboardError] = useState<DashboardError | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setDashboardError(null);

        try {
            // Fetch user profile and usage in parallel — both come from /me
            const [userData, usageData] = await Promise.all([
                authApi.getUserProfile(),
                profileApi.getUsage(),
            ]);
            setUser(userData);
            setUsage(usageData);
        } catch (error) {
            const status = getProjectsErrorStatus(error);
            if (status === 401) {
                // Session expired — redirect immediately, no toast needed
                router.replace("/login");
                return;
            }
            toast.error("Failed to load profile", {
                description: "Could not fetch your account data.",
            });
            setDashboardError({ type: "server" });
            setIsLoading(false);
            return;
        }

        try {
            const projectsData = await projectsApi.getProjects();
            setProjects(projectsData);
        } catch (error) {
            const status = getProjectsErrorStatus(error);
            if (status === 401) {
                router.replace("/login");
                return;
            }
            if (status === 403) {
                setDashboardError({ type: "forbidden" });
                toast.error("Access denied", {
                    description: "You don't have permission to view these projects.",
                });
            } else {
                setDashboardError({ type: "server" });
                toast.error("Failed to load projects", {
                    description: "Could not fetch your projects. Please try again.",
                });
            }
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    // Load on mount. Stable reference via useCallback — no duplicate fetches.
    useEffect(() => {
        loadData();
    }, [loadData]);

    if (isLoading || !user || !usage) {
        return <DashboardSkeleton />;
    }

    // Stats come from backend via usage.fullStats — no frontend calculations
    const stats: Partial<UsageStats> = usage.fullStats ?? {};

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome back, {user.name.split(" ")[0]}!
                    </h1>
                    <p className="text-muted-foreground">
                        Here&apos;s what&apos;s happening with your projects.
                    </p>
                </div>
                <Link href="/create">
                    <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/20 hover:from-indigo-600 hover:to-purple-600">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        New Comic
                    </Button>
                </Link>
            </div>

            {/* Stat Cards — derived from backend /me response */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Comics"
                    value={stats.totalComics ?? String(projects.length)}
                    icon={Layout}
                    trend={stats.comicsTrend ?? ""}
                />
                <StatCard
                    title="Stories Used"
                    value={stats.storiesUsed ?? "0"}
                    icon={PenTool}
                    description={stats.storiesLimit ?? "0/mo"}
                />
                <StatCard
                    title="Current Plan"
                    value={stats.currentPlan ?? user.plan.toUpperCase()}
                    icon={CreditCard}
                    trend={stats.planTrend ?? ""}
                />
                <StatCard
                    title="Credits"
                    value={stats.credits ?? "0"}
                    icon={Sparkles}
                    description={stats.creditsExpiry ?? ""}
                />
            </div>

            {/* Projects Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">Recent Projects</h2>
                    {projects.length > 0 && (
                        <Button variant="ghost" size="sm" className="hidden sm:flex">
                            View All <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Error states — fail loudly */}
                {dashboardError?.type === "forbidden" && <ForbiddenError />}
                {dashboardError?.type === "server" && <ServerError onRetry={loadData} />}

                {/* Happy path */}
                {!dashboardError && projects.length === 0 && <EmptyProjects />}

                {!dashboardError && projects.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    title={project.title}
                                    updatedAt={project.updatedAt}
                                    status={project.status}
                                    thumbnail={project.thumbnail}
                                />
                            ))}
                        </div>
                        <div className="mt-8 flex justify-center sm:hidden">
                            <Button variant="outline" className="w-full">
                                View All Projects
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
