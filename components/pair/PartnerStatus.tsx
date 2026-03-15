"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface PartnerStatusProps {
  partner: {
    name: string | null;
    image: string | null;
  } | null;
  status: string;
}

export function PartnerStatus({ partner, status }: PartnerStatusProps) {
  if (status === "PENDING" || !partner) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">Waiting for partner</Badge>
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
    </div>
  );
}
