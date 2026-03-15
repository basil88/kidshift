"use client";

import { useAuth } from "@/lib/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, signOut } = useAuth();

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email;
  const image =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <h1 className="text-lg font-semibold tracking-tight">KidShift</h1>

        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={image} />
              <AvatarFallback>
                {name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm sm:inline">{name}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
