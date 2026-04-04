import { z } from "zod";

export const workoutProtocolItemSchema = z.object({
  repeaterProtocolId: z.string().uuid("Choose a repeater protocol."),
  repetitions: z.number().int("Repetitions must be a whole number.").min(1, "Repetitions must be greater than 0."),
  restAfterSeconds: z.number().min(0, "Rest must be 0 or greater."),
});

export const workoutProtocolSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(150, "Name must be 150 characters or less."),
  items: z.array(workoutProtocolItemSchema).min(1, "Add at least one repeater protocol."),
});

export type WorkoutProtocolFormValues = z.infer<typeof workoutProtocolSchema>
