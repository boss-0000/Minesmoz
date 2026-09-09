import { z } from "zod";

/** The ten provinces of Mozambique, plus the capital city. */
export const PROVINCES = [
  "Cabo Delgado",
  "Gaza",
  "Inhambane",
  "Manica",
  "Maputo",
  "Maputo Cidade",
  "Nampula",
  "Niassa",
  "Sofala",
  "Tete",
  "Zambézia",
] as const;

export const MINERAL_TYPES = [
  "RUBY",
  "TOURMALINE",
  "GARNET",
  "AQUAMARINE",
  "GOLD",
  "GRAPHITE",
  "HEAVY_SANDS",
  "COAL",
  "OTHER",
] as const;

export const DOCUMENT_TYPES = [
  "MINING_LICENSE",
  "GEOLOGICAL_SURVEY",
  "OWNERSHIP_PROOF",
  "ENVIRONMENTAL_PERMIT",
  "OTHER",
] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10).max(200),
});

export const organizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  registrationNumber: z.string().trim().max(60).optional().or(z.literal("")),
  province: z.enum(PROVINCES).optional().or(z.literal("")),
  contactEmail: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

const optionalCoordinate = (min: number, max: number) =>
  z
    .union([z.literal(""), z.coerce.number().min(min).max(max)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v));

const optionalUsd = z
  .union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000_000)])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const mineSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    mineralType: z.enum(MINERAL_TYPES),
    province: z.enum(PROVINCES),
    district: z.string().trim().max(120).optional().or(z.literal("")),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    latitude: optionalCoordinate(-90, 90),
    longitude: optionalCoordinate(-180, 180),
    licenceReference: z.string().trim().max(80).optional().or(z.literal("")),
    investmentMinUsd: optionalUsd,
    investmentMaxUsd: optionalUsd,
  })
  .refine(
    (v) =>
      v.investmentMinUsd === null ||
      v.investmentMaxUsd === null ||
      v.investmentMaxUsd >= v.investmentMinUsd,
    { message: "The maximum investment must not be below the minimum", path: ["investmentMaxUsd"] },
  );

export const rejectSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
});

/** Normalizes the empty strings a form sends into the nulls the database wants. */
export function blankToNull<T extends Record<string, unknown>>(input: T): T {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = value === "" ? null : value;
  }
  return output as T;
}
