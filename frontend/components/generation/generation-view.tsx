"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWizardStore, hydrateWizard } from "@/lib/store/wizard-store";
import { generationApi, getGenerationErrorMessage } from "@/lib/api/generation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ArrowRight, LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

/**
 * GenerationView — handles the async generation process.
 *
 * RULES:
 * - Triggers POST /generate ONLY if no task ID exists
 * - Polls GET /status if task ID exists
 * - Updates progress bar from backend real data
 * - Handles 409 (Conflict) by redirecting
 * - Handles Success/Failure states correctly
 * - Resumes polling on refresh thanks to sessionStorage hydration
 */
export function GenerationView() {
    const router = useRouter();
    const {
        projectId,
        taskId,
        generationStatus,
        progress,
        error: generationError,
        setTaskId,
        setGenerationStatus,
        setProgress,
        setError,
    } = useWizardStore();

    // Prevent double-triggering
    const isTriggered = useRef(false);

    // 1. Trigger Generation (if needed)
    const triggerGeneration = useCallback(async () => {
        if (!projectId || taskId || isTriggered.current) return;

        isTriggered.current = true;
        setGenerationStatus("queued");

        try {
            const data = await generationApi.startGeneration(projectId);
            setTaskId(data.task_id);
            setGenerationStatus("queued");
        } catch (error) {
            const message = getGenerationErrorMessage(error);
            setError(message);
            setGenerationStatus("failed");
        }
    }, [projectId, taskId, setTaskId, setGenerationStatus, setError]);

    // 2. Poll Status (if task exists)
    useEffect(() => {
        let pollInterval: NodeJS.Timeout;

        const pollStatus = async () => {
            if (!projectId || !taskId) return;
            if (generationStatus === "success" || generationStatus === "failed") return;

            try {
                const data = await generationApi.getGenerationStatus(projectId, taskId);

                if (data.status === "completed") {
                    setGenerationStatus("success");
                    setProgress(100);
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 },
                    });
                } else if (data.status === "failed") {
                    setGenerationStatus("failed");
                    setError(data.error ?? "Generation failed unexpectedly.");
                } else {
                    // Queued or Processing
                    setGenerationStatus(data.status === "queued" ? "queued" : "processing");
                    setProgress(data.progress || 10); // Minimum 10% to show activity
                }
            } catch (err) {
                // Network error during polling — ignore valid 4xx, just wait for next poll
                console.error("Polling error", err);
            }
        };

        if (taskId && generationStatus !== "success" && generationStatus !== "failed") {
            pollStatus(); // Poll immediately
            pollInterval = setInterval(pollStatus, 2000); // And every 2s
        }

        return () => clearInterval(pollInterval);
    }, [projectId, taskId, generationStatus, setGenerationStatus, setProgress, setError]);

    // 3. Mount Logic: Hydrate & Trigger
    useEffect(() => {
        // Restore state first
        hydrateWizard();

        // If we entered this view (status != idle) but have no task, start one.
        // Safety: only if we have a project ID to act on.
        const state = useWizardStore.getState();
        if (state.generationStatus !== "idle" && !state.taskId && state.projectId) {
            triggerGeneration();
        }
    }, [triggerGeneration]);


    // ─── UI Rendering ──────────────────────────────────────────────────────────

    const isProcessing = generationStatus === "queued" || generationStatus === "processing";
    const isSuccess = generationStatus === "success";
    const isFailed = generationStatus === "failed";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <Card className="w-full max-w-md p-8 border-none shadow-2xl bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800">
                <div className="flex flex-col items-center text-center space-y-6">

                    {/* Status Icon */}
                    <div className="relative">
                        {isProcessing && (
                            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                            </div>
                        )}
                        {isSuccess && (
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center"
                            >
                                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </motion.div>
                        )}
                        {isFailed && (
                            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                        )}
                    </div>

                    {/* Text Content */}
                    <div className="space-y-2">
                        <h3 className="text-xl font-semibold tracking-tight">
                            {isProcessing && "Creating your comic..."}
                            {isSuccess && "Comic created successfully!"}
                            {isFailed && "Generation failed"}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            {isProcessing && "Our AI is crafting scenes, generating artwork, and assembling your panels. Hang tight!"}
                            {isSuccess && "Your comic is ready. You can now view it or continue editing from your dashboard."}
                            {isFailed && (generationError || "Something went wrong. Please try again.")}
                        </p>
                    </div>

                    {/* Progress Bar (Processing) */}
                    {isProcessing && (
                        <div className="w-full space-y-2">
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground px-1">
                                <span>{generationStatus === "queued" ? "Queued" : "Processing"}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                        </div>
                    )}

                    {/* Actions (Success/Failed) */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                        {isSuccess && (
                            <>
                                <Button
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={() => router.push(`/viewer/${projectId}`)}
                                >
                                    View Comic <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => router.push("/dashboard")}
                                >
                                    <LayoutDashboard className="w-4 h-4 mr-2" />
                                    Dashboard
                                </Button>
                            </>
                        )}

                        {isFailed && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => router.push("/dashboard")}
                            >
                                Return to Dashboard
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
