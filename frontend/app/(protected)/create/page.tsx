"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWizardStore, hydrateProjectId } from "@/lib/store/wizard-store";
import { projectsApi } from "@/lib/api/projects";
import { getProjectsErrorStatus } from "@/lib/api/projects";
import { StudioLayout } from "@/components/create/studio-layout";
import { StoryEditor } from "@/components/create/story-editor";
import { ReviewSection } from "@/components/create/review-section";
import { GenerationView } from "@/components/generation/generation-view";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function CreatePage() {
    const router = useRouter();
    const {
        generationStatus,
        projectId,
        isSubmitting,
        setProjectId,
        setSubmitting,
    } = useWizardStore();

    const isGenerating = generationStatus !== "idle";

    /**
     * Create project on mount — guarded against duplicates.
     *
     * Guard order:
     * 1. Hydrate projectId from sessionStorage (survives page refresh)
     * 2. If projectId already exists → skip creation (prevents duplicates)
     * 3. Otherwise → call POST /projects once
     */
    const initProject = useCallback(async () => {
        // Step 1: restore from sessionStorage before checking store
        hydrateProjectId(setProjectId);

        // Step 2: re-read store after hydration
        const currentId = useWizardStore.getState().projectId;
        if (currentId) return; // already have a project — do nothing

        // Step 3: create new project
        setSubmitting(true);
        try {
            const project = await projectsApi.createProject("Untitled Comic");
            setProjectId(project.id);
        } catch (error) {
            const status = getProjectsErrorStatus(error);
            if (status === 401) {
                router.replace("/login");
                return;
            }
            toast.error("Could not start your comic", {
                description: "Failed to create a project. Please try again.",
            });
        } finally {
            setSubmitting(false);
        }
    }, [router, setProjectId, setSubmitting]);

    useEffect(() => {
        initProject();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // run once on mount only

    // Show a minimal loader while project is being created
    if (isSubmitting && !projectId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm">Setting up your comic project…</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <StudioLayout>
                <div className="max-w-3xl mx-auto space-y-8">
                    <StoryEditor />
                    <ReviewSection />
                </div>
            </StudioLayout>

            {/* Generation Overlay */}
            <AnimatePresence>
                {isGenerating && <GenerationView />}
            </AnimatePresence>
        </>
    );
}
