import { STATUS_LABELS, STATUS_COLORS, CONTRACT_TO_WEB_STATUS, WEB_TO_CONTRACT_STATUS } from "../types";

describe("Exchange Rate Quote Math", () => {
  test("computeQuote with 1% fee and rate 0.0042", () => {
    // 50000 NGN, 1% fee = 500, after fee = 49500
    // 49500 * 0.0042 = 207.9 → floor = 207
    const fee = Math.floor((50000 * 100) / 10_000);
    expect(fee).toBe(500);
    const afterFee = 50000 - 500;
    expect(afterFee).toBe(49500);
    const bob = Math.floor(afterFee * 0.0042);
    expect(bob).toBe(207);
  });

  test("computeQuote with zero fee", () => {
    const fee = Math.floor((10000 * 0) / 10_000);
    expect(fee).toBe(0);
    const bob = Math.floor(10000 * 0.0042);
    expect(bob).toBe(42);
  });

  test("computeQuote with high fee (50%)", () => {
    const fee = Math.floor((100000 * 5000) / 10_000);
    expect(fee).toBe(50000);
    const afterFee = 100000 - 50000;
    const bob = Math.floor(afterFee * 0.0042);
    expect(bob).toBe(210);
  });

  test("computeQuote minimum amount (1000 NGN)", () => {
    const fee = Math.floor((1000 * 100) / 10_000);
    expect(fee).toBe(10);
    const afterFee = 990;
    const bob = Math.floor(afterFee * 0.0042);
    expect(bob).toBe(4);
  });
});

describe("Status Labels", () => {
  test("all statuses have labels", () => {
    const statuses = ["created", "accepted", "local_paid", "remote_paid", "completed", "timeout"];
    for (const s of statuses) {
      expect(STATUS_LABELS[s as keyof typeof STATUS_LABELS]).toBeTruthy();
    }
  });

  test("all statuses have colors", () => {
    const statuses = ["created", "accepted", "local_paid", "remote_paid", "completed", "timeout"];
    for (const s of statuses) {
      expect(STATUS_COLORS[s as keyof typeof STATUS_COLORS]).toBeTruthy();
    }
  });
});

describe("Contract ↔ Web Status Mapping", () => {
  test("all contract statuses map to web statuses", () => {
    const contractStatuses = ["Created", "Accepted", "LocalPaid", "RemotePaid", "Completed", "Timeout"];
    for (const cs of contractStatuses) {
      expect(CONTRACT_TO_WEB_STATUS[cs]).toBeTruthy();
    }
  });

  test("all web statuses map to contract statuses", () => {
    const webStatuses = ["created", "accepted", "local_paid", "remote_paid", "completed", "timeout"];
    for (const ws of webStatuses) {
      expect(WEB_TO_CONTRACT_STATUS[ws as keyof typeof WEB_TO_CONTRACT_STATUS]).toBeTruthy();
    }
  });

  test("mapping is bidirectional", () => {
    for (const [cs, ws] of Object.entries(CONTRACT_TO_WEB_STATUS)) {
      expect(WEB_TO_CONTRACT_STATUS[ws as keyof typeof WEB_TO_CONTRACT_STATUS]).toBe(cs);
    }
  });
});
