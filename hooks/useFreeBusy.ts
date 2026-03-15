"use client";

import useSWR from "swr";
import { FreeBusyResponse } from "@/lib/types";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

export function useFreeBusy(date: string) {
  const { data, error, isLoading, mutate } = useSWR<FreeBusyResponse>(
    `/api/calendar/freebusy?date=${date}`,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: true,
      dedupingInterval: 30 * 1000, // Don't re-fetch within 30s
    }
  );

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}
