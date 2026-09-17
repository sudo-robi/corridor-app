export interface Agent {
  address: string;
  collateral: number;
  reputation: number;
  activeCorridors: number;
  maxCorridors: number;
  supportedSide: "ngn" | "bob" | "both";
  rateBps: number;
}

export type CorridorStatus =
  | "created"
  | "accepted"
  | "local_paid"
  | "remote_paid"
  | "completed"
  | "timeout";

// Maps Soroban contract enum variants to web status strings
export const CONTRACT_TO_WEB_STATUS: Record<string, CorridorStatus> = {
  Created: "created",
  Accepted: "accepted",
  LocalPaid: "local_paid",
  RemotePaid: "remote_paid",
  Completed: "completed",
  Timeout: "timeout",
};

// Maps web status strings to Soroban contract enum variants
export const WEB_TO_CONTRACT_STATUS: Record<CorridorStatus, string> = {
  created: "Created",
  accepted: "Accepted",
  local_paid: "LocalPaid",
  remote_paid: "RemotePaid",
  completed: "Completed",
  timeout: "Timeout",
};

export interface Corridor {
  id: number;
  sender: string;
  receiverPhone: string;
  amountSend: number;
  amountReceive: number;
  status: CorridorStatus;
  agent: string | null;
  createdAt: number;
  expiresAt: number;
  completedAt: number | null;
  feeBps: number;
  paystackRef: string | null;
}

export interface CorridorQuote {
  sendAmount: number;
  receiveAmount: number;
  feeBps: number;
  exchangeRate: number;
}

export const STATUS_LABELS: Record<CorridorStatus, string> = {
  created: "Waiting for Agent",
  accepted: "Agent Matched",
  local_paid: "NGN Received",
  remote_paid: "BOB Sent",
  completed: "Completed",
  timeout: "Timed Out",
};

export const STATUS_COLORS: Record<CorridorStatus, string> = {
  created: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  accepted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  local_paid: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  remote_paid: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  timeout: "bg-red-500/20 text-red-400 border-red-500/30",
};
