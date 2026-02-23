"use client";

import { useWizardStore } from "@/lib/store/wizard-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { storyApi, getStoryErrorMessage } from "@/lib/api/story";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, FileText, Wand2, Save, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * ReviewSection — summary + submission controls.
 *
 * RULES:
 * - Never sends plan info to backend
 * - Never calculates page counts
 * - Backend is the single source of truth for validation
 * - 422 errors shown inline (user must fix input)
 * - 401/403/500 shown as toasts
 */
export function ReviewSection() {
    const router = useRouter();
    const {
        storyText,
        projectId,
        isSubmitting,
        submitError,
        setGenerationStatus,
        setStorySubmitted,
        setSubmitting,
        setSubmitError,
    } = useWizardStore();

    const user = useAuthStore((state) => state.user);

    // Mirror backend min_length=10 for button disabled state only.
    // Backend is still the authority — this is a UX guard, not validation.
    const isReady = storyText.length >= 10 && !!projectId && !isSubmitting;

    /**
     * Submit story to backend for LLM parsing.
     * Hands off to GenerationView on success.
     */
    const handleGenerate = async () => {
        if (!projectId) {
            toast.error("No project found", {
                description: "Please refresh the page and try again.",
            });
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            await storyApi.parseStory(projectId, storyText);
            setStorySubmitted(true);
            // Hand off to generation overlay — do NOT trigger generation here
            // (generation is STEP-4 scope)
            setGenerationStatus("processing");
        } catch (error) {
            const { status, message } = getStoryErrorMessage(error);

            if (status === 401) {
                router.replace("/login");
                return;
            }
            if (status === 403) {
                toast.error("Access denied", { description: message });
                return;
            }
            if (status === 422) {
                // Show inline — user needs to fix their story text
                setSubmitError(message);
                return;
            }
            // 500 / network
            toast.error("Generation failed", { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    /**
     * Save as draft — navigate back to dashboard.
     * Project already exists in backend as DRAFT status.
     * No story submission needed.
     */
    const handleSaveDraft = () => {
        router.push("/dashboard");
    };

    const planLabel = user?.plan
        ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1)
        : "—";

    return (
        <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-tight">Summary</h3>
                <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                    Ready to Create
                </span>
            </div>

            <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
                            <FileText className="w-3.5 h-3.5" /> Plan
                        </span>
                        <p className="font-medium">{planLabel}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
                            <Wand2 className="w-3.5 h-3.5" /> Style
                        </span>
                        <p className="font-medium">Auto-Detect</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5" /> Status
                        </span>
                        <p className={`font-medium ${storyText.length >= 10 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                            {storyText.length >= 10 ? "Ready" : "Waiting for story…"}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Inline validation error from backend (422) */}
            {submitError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{submitError}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/20 py-6 text-lg font-medium transition-all hover:scale-[1.02]"
                    disabled={!isReady}
                    onClick={handleGenerate}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Submitting…
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                            Generate Comic
                        </>
                    )}
                </Button>
                <Button
                    variant="outline"
                    className="py-6 text-base font-medium sm:w-40"
                    disabled={isSubmitting}
                    onClick={handleSaveDraft}
                >
                    <Save className="w-4 h-4 mr-2" />
                    Draft
                </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground pt-2">
                This will use your monthly credits. Page limits are determined by your plan.
            </p>
        </div>
    );
}
