import crypto from "crypto";

// Mock the store module
jest.mock("../lib/store", () => ({
  transitionCorridor: jest.fn(),
  setCorridor: jest.fn(),
  getCorridor: jest.fn(),
}));

import { transitionCorridor, setCorridor, getCorridor } from "../lib/store";

const mockTransition = transitionCorridor as jest.MockedFunction<typeof transitionCorridor>;
const mockSetCorridor = setCorridor as jest.MockedFunction<typeof setCorridor>;
const mockGetCorridor = getCorridor as jest.MockedFunction<typeof getCorridor>;

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

  test("accepts valid signature and transitions corridor", async () => {
    mockTransition.mockReturnValue({
      ok: true,
      corridor: { id: 42, status: "local_paid", paystackRef: null } as any,
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
    expect(mockTransition).toHaveBeenCalledWith(42, "local_paid");
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
    expect(mockTransition).not.toHaveBeenCalled();
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
    expect(mockTransition).not.toHaveBeenCalled();
  });
});
