"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PairCodeDisplayProps {
  code: string;
}

export function PairCodeDisplay({ code }: PairCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteUrl = `${window.location.origin}/pair/invite/${code}`;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Pair Code</CardTitle>
        <CardDescription>
          Share this code with your partner so they can join.
          <br />
          Expires in 24 hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-4xl font-bold tracking-[0.3em]">
            {code}
          </span>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" className="flex-1">
            {copied ? "Copied!" : "Copy Code"}
          </Button>
          <Button onClick={handleCopyLink} variant="outline" className="flex-1">
            Copy Invite Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
