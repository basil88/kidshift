"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PartnerStatusProps {
  partner: {
    name: string | null;
    image: string | null;
  } | null;
  status: string;
  onUnlink?: () => Promise<void>;
}

export function PartnerStatus({ partner, status, onUnlink }: PartnerStatusProps) {
  const [unlinking, setUnlinking] = useState(false);

  async function handleUnlink() {
    const confirmed = window.confirm(
      `Unlink from ${partner?.name || "your partner"}? You'll both need to re-pair to see each other's calendar again.`
    );
    if (!confirmed) return;

    setUnlinking(true);
    try {
      await onUnlink?.();
    } finally {
      setUnlinking(false);
    }
  }

  if (status === "PENDING" || !partner) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">Waiting for partner</Badge>
        {onUnlink && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-0.5 text-xs text-muted-foreground"
            onClick={handleUnlink}
            disabled={unlinking}
          >
            Cancel
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6">
        <AvatarImage src={partner.image || undefined} />
        <AvatarFallback className="text-xs">
          {partner.name?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm">
        Paired with <strong>{partner.name || "Partner"}</strong>
      </span>
      <Badge variant="default" className="bg-emerald-600">
        Active
      </Badge>
      {onUnlink && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-0.5 text-xs text-destructive hover:text-destructive"
          onClick={handleUnlink}
          disabled={unlinking}
        >
          {unlinking ? "Unlinking…" : "Unlink"}
        </Button>
      )}
    </div>
  );
}
