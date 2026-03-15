export interface BusySlot {
  start: string; // ISO 8601
  end: string;
}

export interface FreeBusyResponse {
  you: BusySlot[];
  partner: BusySlot[];
  conflicts: BusySlot[];
  fetchedAt: string; // ISO 8601
}

export interface PairInfo {
  id: string;
  status: "PENDING" | "ACTIVE" | "DISSOLVED";
  code: string;
  partner: {
    name: string | null;
    image: string | null;
  } | null;
}

export type SlotState = "both-free" | "you-busy" | "partner-busy" | "conflict";
