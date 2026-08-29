import { z } from "zod";

// Event creation — paid members (BridgeMaker / BridgeMaster) only.
// `startsAt`/`endsAt` come as ISO strings from the client form.
export const eventCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    location: z.string().trim().max(160).optional().or(z.literal("")),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date().optional().nullable(),
    capacity: z.coerce.number().int().min(2).max(10_000).optional().nullable(),
    visibility: z.enum(["PUBLIC", "MEMBERS_ONLY"]).default("PUBLIC"),
  })
  .refine((v) => !v.endsAt || v.endsAt > v.startsAt, {
    message: "End time must be after the start time.",
    path: ["endsAt"],
  })
  .refine((v) => v.startsAt.getTime() > Date.now() - 60 * 60 * 1000, {
    message: "Start time must be in the future.",
    path: ["startsAt"],
  });
