"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";

/** Maps backend lowercase plan to display label */
const PLAN_LABELS: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    creative: "Creative",
};

/** Maps plan to badge gradient style */
const PLAN_BADGE_CLASS: Record<string, string> = {
    free: "bg-zinc-600 text-white border-0",
    pro: "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0",
    creative: "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0",
};

export function UserNav() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    const displayName = user?.name ?? "";
    const displayEmail = user?.email ?? "";
    const plan = user?.plan ?? "free";
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    async function handleLogout() {
        await logout();
        router.push("/login");
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-indigo-500/20">
                        <AvatarImage src="/avatars/01.png" alt={displayName} />
                        <AvatarFallback>{initials || "?"}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {displayEmail}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <div className="px-2 py-1.5 flex justify-between items-center">
                        <span className="text-sm">Plan</span>
                        <Badge
                            variant="secondary"
                            className={PLAN_BADGE_CLASS[plan] ?? PLAN_BADGE_CLASS.free}
                        >
                            {PLAN_LABELS[plan] ?? plan}
                        </Badge>
                    </div>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => router.push("/profile")}>
                        Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/pricing")}>
                        Billing
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-red-500 focus:text-red-500"
                    onClick={handleLogout}
                >
                    Log out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
