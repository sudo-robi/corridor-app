import { NextResponse } from "next/server";
import {
  getAllAgents,
  getAllCorridors,
  setAgent,
  setCorridor,
  type AgentRecord,
  type CorridorRecord,
} from "@/lib/store";

// Idempotent demo seed. Only seeds when both stores are empty.
export async function POST() {
  if (getAllAgents().length > 0 || getAllCorridors().length > 0) {
    return NextResponse.json({ seeded: false, reason: "stores not empty" });
  }

  const now = Math.floor(Date.now() / 1000);

  const agents: AgentRecord[] = [
    {
      address: "GDLFJQK4M2NX7PQR3TUV6WXYZABCD5EFGH6JKLMN7PQRST8UVWX9",
      reputation: 234,
      activeCorridors: 1,
      maxCorridors: 10,
      collateral: 10000,
      rateBps: 80,
      supportedSide: "both",
      completedToday: 12,
      registeredAt: now - 86400 * 30,
    },
    {
      address: "GCKR4M2NX7PQR3TUV6WXYZABCD5EFGH6JKLMN7PQRST8UVWXY1",
      reputation: 156,
      activeCorridors: 1,
      maxCorridors: 5,
      collateral: 5000,
      rateBps: 100,
      supportedSide: "both",
      completedToday: 8,
      registeredAt: now - 86400 * 14,
    },
    {
      address: "GBTV2M2NX7PQR3TUV6WXYZABCD5EFGH6JKLMN7PQRST8UVWXY3",
      reputation: 89,
      activeCorridors: 0,
      maxCorridors: 3,
      collateral: 2000,
      rateBps: 150,
      supportedSide: "ngn",
      completedToday: 3,
      registeredAt: now - 86400 * 5,
    },
  ];
  agents.forEach(setAgent);

  const corridors: CorridorRecord[] = [
    {
      id: 1001,
      sender: "GSNDR4M2NX7PQR3TUV6WXYZABCD5EFGH6JKLMN7PQRST8UVWXY7",
      receiverPhone: "+591 7123 4567",
      amountSend: 75000,
      amountReceive: 311,
      status: "completed",
      agent: agents[0].address,
      createdAt: now - 3600,
      expiresAt: now - 3300,
      completedAt: now - 3300,
      feeBps: 80,
      paystackRef: "PSK-DEMO-1001",
    },
    {
      id: 1002,
      sender: "GSNDR4M2NX7PQR3TUV6WXYZABCD5EFGH6JKLMN7PQRST8UVWXY7",
      receiverPhone: "+591 7654 3210",
      amountSend: 120000,
      amountReceive: 498,
      status: "local_paid",
      agent: agents[1].address,
      createdAt: now - 600,
      expiresAt: now - 300 + 600,
      completedAt: null,
      feeBps: 100,
      paystackRef: "PSK-DEMO-1002",
    },
    {
      id: 1003,
      sender: "GSNDR4M2NX7PQR3TUV6WXYZABCD5EFGH6JKLMN7PQRST8UVWXY7",
      receiverPhone: "+591 7988 1122",
      amountSend: 25000,
      amountReceive: 103,
      status: "accepted",
      agent: agents[1].address,
      createdAt: now - 120,
      expiresAt: now + 180,
      completedAt: null,
      feeBps: 100,
      paystackRef: null,
    },
  ];
  corridors.forEach(setCorridor);

  // Keep agent active counts in sync with seeded corridors
  setAgent({ ...agents[0], activeCorridors: 0 });
  setAgent({ ...agents[1], activeCorridors: 2 });

  return NextResponse.json({ seeded: true, agents: 3, corridors: 3 });
}
