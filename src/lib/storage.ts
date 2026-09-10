import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Private document storage.
 *
 * Two rules hold for both drivers:
 *
 *  1. Nothing is ever written under `public/`. There is no static path that
 *     serves an uploaded file, so no permanent public link can exist.
 *  2. A storage key is opaque and is never sent to a browser. Download URLs are
 *     minted per request, only after authorization has passed, and expire.
 *
 * The S3 driver is what staging and production use. The local-filesystem driver
 * exists so the project runs with no cloud credentials; it is documented in the
 * README as a development-only fallback.
 */

const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

const LOCAL_ROOT = path.join(process.cwd(), ".local-storage");

export type StorageDriver = "s3" | "local";

export function activeDriver(): StorageDriver {
  const hasS3 = Boolean(process.env.S3_BUCKET && process.env.AWS_ACCESS_KEY_ID);

  // The local driver must never run on a serverless host. Filesystems there are
  // ephemeral and per-instance, so an upload would report success, then vanish
  // on the next cold start or land on an instance that cannot see it. Silent
  // data loss is worse than a refusal, so this fails loudly instead.
  if (!hasS3 && process.env.NODE_ENV === "production") {
    throw new Error(
      "No object storage is configured. Set S3_BUCKET, AWS_ACCESS_KEY_ID, " +
        "AWS_SECRET_ACCESS_KEY and AWS_REGION. The local filesystem driver is " +
        "for development only and would lose uploaded documents in production.",
    );
  }

  return hasS3 ? "s3" : "local";
}

/** Opaque, unguessable, and namespaced by mine so objects are easy to reap. */
export function buildStorageKey(mineId: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, "").slice(0, 12);
  return `mines/${mineId}/${randomUUID()}${ext}`;
}

/* ---------------------------------------------------------------- local fs */

function resolveLocalPath(key: string): string {
  // Defence against a crafted key escaping the storage root.
  const resolved = path.resolve(LOCAL_ROOT, key);
  if (!resolved.startsWith(path.resolve(LOCAL_ROOT) + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

/* -------------------------------------------------------------------- s3 */

async function s3Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  const endpoint = process.env.S3_ENDPOINT?.trim();

  return new S3Client({
    // R2 ignores the region but the SDK still requires one; "auto" is what
    // Cloudflare documents.
    region: process.env.AWS_REGION ?? (endpoint ? "auto" : "eu-west-1"),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    // Set for S3-compatible services (Cloudflare R2, MinIO, Backblaze B2).
    // Left undefined for real AWS S3, which resolves its own endpoint.
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  });
}

/* ------------------------------------------------------------------ public */

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  if (activeDriver() === "s3") {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: body,
        ContentType: contentType,
        // The bucket itself blocks public access; this is belt and braces.
        ACL: "private",
      }),
    );
    return;
  }

  const target = resolveLocalPath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
}

/**
 * Returns a short-lived signed URL for the S3 driver, or null for the local
 * driver — in which case the caller streams the bytes through the authorized
 * route instead. Either way the client never receives a durable link.
 */
export async function createSignedDownloadUrl(
  key: string,
  downloadName: string,
): Promise<string | null> {
  if (activeDriver() !== "s3") return null;

  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = await s3Client();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${downloadName.replace(/"/g, "")}"`,
    }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );
}

export async function readObject(key: string): Promise<Buffer> {
  if (activeDriver() === "s3") {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await s3Client();
    const result = await client.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
    );
    return Buffer.from(await result.Body!.transformToByteArray());
  }

  return readFile(resolveLocalPath(key));
}

export const SIGNED_URL_TTL = SIGNED_URL_TTL_SECONDS;
