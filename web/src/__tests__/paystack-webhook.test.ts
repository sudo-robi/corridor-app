import crypto from "crypto";

// Mock the workflow layer (webhook must call markFiatPaid, never raw maps)
jest.mock("../lib/store", () => ({
  markFiatPaid: jest.fn(),
}));

import { markFiatPaid } from "../lib/store";

const mockMarkFiatPaid = markFiatPaid as jest.MockedFunction<typeof markFiatPaid>;

function makeWebhookBody(event: string, metadata: any = {}) {
  return {
    event,
    data: {
      reference: "ref_123",
      amount: 5000000,
      metadata: { corridorId: "42", ...metadata },
    },
  };
}

function signBody(body: any, secret: string): string {
  return crypto.createHmac("sha512", secret).update(JSON.stringify(body)).digest("hex");
}

describe("Paystack Webhook", () => {
  const SECRET = "test_secret_key_123";

  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = SECRET;
    jest.clearAllMocks();
  });

  test("rejects missing signature", async () => {
    const { POST } = require("../app/api/paystack/webhook/route");
    const req = new Request("http://localhost/api/paystack/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(makeWebhookBody("charge.success")),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing signature");
  });

  test("rejects invalid signature", async () => {
    const { POST } = require("../app/api/paystack/webhook/route");
    const body = makeWebhookBody("charge.success");
    const req = new Request("http://localhost/api/paystack/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": "invalid_hex",
      },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  test("routes verified payment through markFiatPaid workflow", async () => {
    mockMarkFiatPaid.mockReturnValue({
      ok: true,
      corridor: { id: 42, status: "local_paid", paystackRef: "ref_123" } as any,
      extra: { duplicate: false },
    });

    const { POST } = require("../app/api/paystack/webhook/route");
    const body = makeWebhookBody("charge.success");
    const sig = signBody(body, SECRET);

    const req = new Request("http://localhost/api/paystack/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": sig,
      },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockMarkFiatPaid).toHaveBeenCalledWith(42, "ref_123");
  });

  test("ignores non-charge.success events", async () => {
    const { POST } = require("../app/api/paystack/webhook/route");
    const body = makeWebhookBody("charge.failed");
    const sig = signBody(body, SECRET);

    const req = new Request("http://localhost/api/paystack/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": sig,
      },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockMarkFiatPaid).not.toHaveBeenCalled();
  });

  test("handles invalid corridorId gracefully", async () => {
    const { POST } = require("../app/api/paystack/webhook/route");
    const body = makeWebhookBody("charge.success", { corridorId: "not_a_number" });
    const sig = signBody(body, SECRET);

    const req = new Request("http://localhost/api/paystack/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": sig,
      },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockMarkFiatPaid).not.toHaveBeenCalled();
  });
});
