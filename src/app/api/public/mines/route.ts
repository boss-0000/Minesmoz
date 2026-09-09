import { NextResponse } from "next/server";
import { z } from "zod";

import { listPublicMines } from "@/lib/repositories/mines";
import { MINERAL_TYPES, PROVINCES } from "@/lib/validation";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  mineralType: z.enum(MINERAL_TYPES).optional(),
  province: z.enum(PROVINCES).optional(),
});

/**
 * Public list. Uses the same APPROVED-only query as the detail route, so the
 * collection endpoint cannot become the hole that leaks what the detail
 * endpoint refuses — the usual way this class of bug appears.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const parsed = querySchema.safeParse({
    mineralType: url.searchParams.get("mineralType") ?? undefined,
    province: url.searchParams.get("province") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filter" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const mines = await listPublicMines(parsed.data);

  return NextResponse.json(
    { count: mines.length, mines },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
