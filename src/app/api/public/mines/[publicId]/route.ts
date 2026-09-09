import { NextResponse } from "next/server";

import { getPublicMine } from "@/lib/repositories/mines";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated read of a single mine.
 *
 * This is the endpoint most worth probing, so it is deliberately thin: it calls
 * the same status-filtered query the public page uses and returns the same
 * allowlisted projection. A draft, submitted or rejected mine is a 404 here,
 * identical to a publicId that was never issued.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await context.params;

  const mine = await getPublicMine(publicId);

  if (!mine) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { mine },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
