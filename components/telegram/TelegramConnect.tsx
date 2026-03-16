"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TelegramConnect() {
  const [loading, setLoading] = useState(false);
  const [linkData, setLinkData] = useState<{
    code: string;
    botUrl: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate code");
      }
      const data = await res.json();
      setLinkData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-medium">Telegram Bot</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Ask about your partner&apos;s availability via Telegram.
      </p>

      {linkData ? (
        <div className="mt-3 space-y-2">
          <p className="text-sm">
            Your code: <span className="font-mono font-bold">{linkData.code}</span>
          </p>
          <a
            href={linkData.botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
          >
            Open in Telegram
          </a>
          <p className="text-xs text-muted-foreground">
            Code expires in 10 minutes.
          </p>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? "Generating..." : "Connect Telegram"}
        </Button>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
