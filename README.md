# MinesMoz — Phase 1 vertical slice

A single, complete workflow built to demonstrate the technical approach for
MinesMoz Phase 1. It is deliberately **not** a broad visual demo: one flow is
implemented properly, end to end, with the permission and privacy rules enforced
server-side.

```
register → mine-owner organization → mine draft → private document upload
        → submit for review → administrator approves or rejects
        → only an approved mine gets a public page
```

Everything outside that path (marketplace, gem auctions, tech-provider
directory, interactive map, news, enquiries) is intentionally absent.

---

## 1. Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16, App Router, TypeScript, Server Actions |
| Database | PostgreSQL via Prisma 6 |
| Auth | Auth.js v5, credentials provider, JWT sessions |
| Storage | S3 with private objects and signed URLs (local filesystem driver for dev) |
| i18n | next-intl — Portuguese default, English second |
| Styling | Tailwind CSS v4 |

This is the production stack proposed for the full build, not a throwaway.

---

## 2. Running it locally

```bash
pnpm install
cp .env.example .env          # then fill DATABASE_URL and AUTH_SECRET
pnpm prisma migrate dev       # create the schema
pnpm db:seed                  # test accounts and demo data
pnpm dev
```

`AUTH_SECRET` can be generated with `openssl rand -base64 32`.

With `S3_BUCKET` empty the local-filesystem storage driver is used, writing to
`./.local-storage` — outside `public/`, so nothing is ever statically served.

The seed prints the ids worth probing (an approved mine, a submitted one, a
draft, and a mine belonging to a second organization).

---

## 3. Test accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@minesmoz.test` | `Admin!Demo2026` |
| Mine owner — Rovuma Gems | `owner@minesmoz.test` | `Owner!Demo2026` |
| Mine owner — Lichinga Minerais | `owner2@minesmoz.test` | `Owner2!Demo2026` |

The second mine owner exists so that **cross-organization isolation can be
tested**, not just the admin/owner split.

All seeded organizations, mines and documents are fictitious.

---

## 4. Security model, and how to verify each claim

This is the part worth reviewing. Each claim below is one you can check by hand,
and all of them are also asserted automatically:

```bash
pnpm db:seed
pnpm verify:workflow    # 21 checks — the state machine and its guards
pnpm dev                # one terminal
pnpm verify:security    # another — 17 checks over real HTTP
```

- `scripts/verify-security.ts` signs in as each role over the real HTTP API and
  checks status codes, payload shape and headers.
- `scripts/verify-workflow.ts` drives the moderation state machine against the
  real database: every legal transition, every illegal one, and the audit trail.

Both exit non-zero if a guarantee regresses. **38/38 currently pass** against
PostgreSQL 17. They are evidence, not decoration.

### 4.1 An unapproved mine is not reachable publicly

- **Where:** [`getPublicMine()`](src/lib/repositories/mines.ts) filters on
  `status: "APPROVED"` inside the query, not after it.
- **Verify:** sign out. Take the DRAFT or SUBMITTED `publicId` printed by the
  seed and open `/[locale]/mines/<publicId>` → **404**. Then
  `curl -i /api/public/mines/<publicId>` → **404**.

**404, not 403, is deliberate.** A 403 confirms the record exists, which turns
an id into an oracle. A draft, a submitted mine, a rejected mine and an id that
never existed are all answered identically.

`publicId` is a separate non-sequential `cuid`. Internal integer-ish ids are
never exposed, so the public surface cannot be enumerated.

### 4.2 The list endpoint cannot leak what the detail endpoint refuses

Collection endpoints are the usual source of this bug. `/api/public/mines` and
the public directory page both call the same `APPROVED`-only query and return
the same allowlisted projection.

The projection ([`PUBLIC_MINE_SELECT`](src/lib/repositories/mines.ts)) is an
**allowlist**. `rejectionReason`, documents, moderation history, internal ids and
organization contact details are absent by construction, so adding a column to
the model later cannot silently publish it.

### 4.3 No cached copy can outlive an unpublish

Every mine route is `force-dynamic` with `revalidate = 0`. An ISR copy generated
while a mine was approved would otherwise keep being served after it was
unpublished — which would defeat the filter entirely. The build output confirms
every route is `ƒ` (server-rendered on demand).

### 4.4 Uploaded documents stay private, with no permanent link

- Nothing is written under `public/`. There is no static path to an upload.
- The database stores an opaque `storageKey`, never a URL. The key is never sent
  to a browser.
- [`/api/documents/[id]`](src/app/api/documents/[id]/route.ts) is the only route
  that can reach a document. It requires a session, resolves the document
  through an organization-scoped query, and answers **404** in every failure
  case.
- On S3 it then issues a **5-minute signed URL**; on the local driver it streams
  the bytes. Neither is durable.
- Responses are `Cache-Control: private, no-store` and
  `Content-Disposition: attachment`.

**Verify:** as the owner, copy a document link and open it — it downloads. Sign
out and open the same link → **404**. On an S3 deployment, capture the signed URL
it redirects to, wait five minutes, and retry → **expired**.

### 4.5 Roles are separated, and so are organizations

Two independent checks, deliberately duplicated:

1. `requireAdmin()` / `requireOrganization()` in the server action, and
2. a role or `organizationId` predicate in the repository query itself.

A future caller that forgets the guard still cannot read or write another
organization's data.

**Verify:**
- Sign in as `owner@minesmoz.test` and open the other organization's mine id
  (printed by the seed) at `/[locale]/dashboard/mines/<id>` → **404**.
- As a mine owner, open `/[locale]/admin` → redirected away; posting the approve
  action directly fails on the server.
- Self-registration always creates a `MINE_OWNER`; the role is hard-coded and a
  `role` field in the request body is ignored. There is no path from public
  registration to an administrator account.

### 4.6 Authorization is not done in the proxy/middleware

`src/proxy.ts` handles **locale routing only**.

Middleware cannot know which row a request concerns, so it can only guard path
prefixes — and prefix guards have a poor record in Next.js (CVE-2025-29927 let a
crafted header skip middleware entirely). Deleting `src/proxy.ts` would cost the
locale prefixes and nothing else; it would not open a single record.

### 4.7 State transitions cannot be raced or forged

The permitted transitions are explicit:

```
DRAFT     → SUBMITTED
SUBMITTED → APPROVED | REJECTED
REJECTED  → SUBMITTED
APPROVED  → (frozen)
```

Every transition is an `updateMany` with the expected status **in the WHERE
clause**, inside a transaction. A row that has already moved matches zero rows
and the action fails loudly. So:

- a mine cannot be approved twice,
- an owner cannot push a draft straight to `APPROVED`,
- two concurrent submissions cannot both succeed,
- rejecting requires a reason (≥10 characters), shown to the owner,
- an approved mine can no longer be edited.

Each transition writes an append-only `ModerationEvent` with the actor, so every
decision is attributable.

### 4.8 Other hardening

- Passwords hashed with bcrypt, cost 12.
- Login compares against a dummy hash when the email is unknown, so timing does
  not reveal whether an account exists; the error message is identical either way.
- All input validated with Zod at the server boundary.
- Uploads: 10 MB cap and a MIME allowlist that excludes HTML and SVG.
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, no `X-Powered-By`.
- The prototype sets `robots: noindex`.

---

## 5. What is real, and what is not

### Fully functional
- Registration, login, logout, session handling, role separation.
- Organization profile creation and editing.
- Mine draft creation and editing, with validation.
- Private document upload, listing and authorized download.
- Submit for review, with the document requirement enforced server-side.
- Administrator queue, approval and rejection with a mandatory reason.
- Rejection returned to the owner, correction, and resubmission.
- Public directory and public mine page, approved records only.
- Public JSON API with the same guarantees.
- Portuguese and English across every screen built.
- Responsive from ~360 px upwards.

### Simplified, and clearly so
- **Storage driver.** With `S3_BUCKET` unset, uploads go to the local
  filesystem and are streamed through the authorized route. The privacy
  guarantee holds in both modes, but the 5-minute signed-URL expiry only
  exercises on S3.

  The local driver **refuses to run when `NODE_ENV=production`**. Serverless
  filesystems are ephemeral and per-instance, so an upload would report success
  and then disappear; a deployment without object storage fails loudly rather
  than losing documents quietly. Configure S3 or R2 before deploying.
- **Organization verification** is displayed and admin-controlled at the data
  level, but no admin screen to change it is included — it was not part of the
  requested flow.
- **No email is sent.** Approval and rejection are visible in the dashboard.
  Transactional email is a Milestone 1 item.
- **No document deletion or replacement** — upload and read only.
- **One member per organization.** The schema supports many; no invite flow.
- **Rate limiting** is not implemented; it belongs at the platform edge and is
  noted rather than faked.
- **No unit-test suite.** There are two executable verification scripts (38
  assertions covering authorization and the state machine), but no component or
  unit tests. A full suite is budgeted in Milestone 1.
- Seeded content is fictitious, including licence references.

### Deliberately excluded
Live bidding, WebSockets, payments, escrow, anti-sniping, the interactive map,
marketplace, tech-provider directory, news, and enquiries. All Phase 1 or Phase 2
scope, none of it part of this slice.

---

## 6. Does this become Milestone 1?

Yes. This is production-quality code on the proposed stack, not a throwaway.
The schema, the authorization layer, the moderation state machine and the
storage abstraction are the foundation Milestone 1 builds on. Nothing here is
discarded if the project proceeds.

The auction tables are **not** included — building them would have exceeded the
requested slice. The data model is structured so they attach without
restructuring what exists.

---

## 7. Notes

- The accounts in section 3 are seed accounts for a disposable evaluation
  environment holding fictitious data. They are not production credentials and
  the environment can be torn down and reseeded at any time.
- All code, schema and infrastructure remain the client's property, in the
  client's accounts.
