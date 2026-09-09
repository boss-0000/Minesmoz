import { NextResponse } from "next/server";

import { getActor } from "@/lib/authz";
import { getDocumentForActor } from "@/lib/repositories/documents";
import { activeDriver, createSignedDownloadUrl, readObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * The only route that can reach an uploaded document.
 *
 * There is no static path to the object store, so this handler is the whole
 * access control surface. It:
 *
 *   1. requires a session;
 *   2. resolves the document through an organization-scoped query, so an owner
 *      from another organization gets nothing;
 *   3. answers 404 — not 403 — in every failure case, so document ids cannot be
 *      probed for existence;
 *   4. hands back either a signed URL valid for five minutes (S3) or the bytes
 *      themselves (local driver). Neither is a durable link.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const document = await getDocumentForActor(actor, id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const noStore = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };

  if (activeDriver() === "s3") {
    const url = await createSignedDownloadUrl(document.storageKey, document.originalName);
    if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 302 to a URL that expires. The browser follows it; nothing durable is
    // written into the page.
    return NextResponse.redirect(url, { status: 302, headers: noStore });
  }

  const bytes = await readObject(document.storageKey);

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      ...noStore,
      "Content-Type": document.mimeType,
      "Content-Length": String(bytes.byteLength),
      // attachment, so a PDF or image can never render inline in this origin.
      "Content-Disposition": `attachment; filename="${document.originalName.replace(/"/g, "")}"`,
    },
  });
}
