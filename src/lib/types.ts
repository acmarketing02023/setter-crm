export type CallOutcome = "NO_ANSWER" | "NOT_INTERESTED" | "CALLBACK" | "BOOKED";
export type BookingStatus = "SCHEDULED" | "WON" | "LOST" | "CANCELED";
export type BookingSource = "COLD_CALL" | "SETTER_DIRECT" | "LANDING_PAGE" | "OTHER";

export type CallDTO = {
  id: string;
  contractorName: string;
  phone: string | null;
  outcome: CallOutcome;
  note: string | null;
  createdAt: string;
  setterId: string;
};

export type BookingDTO = {
  id: string;
  contractorName: string;
  phone: string | null;
  scheduledAt: string;
  setterNotes: string;
  closerBriefing: string;
  status: BookingStatus;
  source: BookingSource;
  createdAt: string;
  setterId: string;
  viewedAt: string | null;
  setter?: { name: string };
};

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  NO_ANSWER: "No Answer",
  NOT_INTERESTED: "Not Interested",
  CALLBACK: "Callback Requested",
  BOOKED: "Booked",
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  SCHEDULED: "Scheduled",
  WON: "Won",
  LOST: "Lost",
  CANCELED: "Canceled",
};

export const SOURCE_LABELS: Record<BookingSource, string> = {
  COLD_CALL: "Cold Call",
  SETTER_DIRECT: "Setter",
  LANDING_PAGE: "Landing Page",
  OTHER: "Other",
};
