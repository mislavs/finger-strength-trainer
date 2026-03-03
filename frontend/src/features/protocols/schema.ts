import { z } from "zod"

export const protocolSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(150, "Name must be 150 characters or less."),
  maxWeightKg: z.number().min(0, "Max weight must be 0 or greater."),
  weightPercentage: z.number().min(0, "Weight percentage must be at least 0.").max(100, "Weight percentage must be at most 100."),
  setsPerHand: z.number().int("Sets per hand must be a whole number.").min(1, "Sets per hand must be greater than 0."),
  workSeconds: z.number().gt(0, "Work seconds must be greater than 0."),
  restSeconds: z.number().min(0, "Rest seconds must be 0 or greater."),
  handSwitchSeconds: z.number().min(0, "Hand switch seconds must be 0 or greater."),
  countdownSeconds: z.number().min(0, "Countdown seconds must be 0 or greater."),
  audioCues: z.boolean(),
  countdownBeeps: z.boolean(),
})

export type ProtocolFormValues = z.infer<typeof protocolSchema>
