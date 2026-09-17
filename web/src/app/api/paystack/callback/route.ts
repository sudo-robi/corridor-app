import { NextRequest } from "next/server";
import { redirect } from "next/navigation";

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  const corridorId = req.nextUrl.searchParams.get("corridor");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (reference) {
    redirect(`${appUrl}?payment=success&ref=${reference}${corridorId ? `&corridor=${corridorId}` : ""}`);
  }

  redirect(`${appUrl}?payment=failed`);
}
