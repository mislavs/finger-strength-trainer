import type { FieldPathByValue } from "react-hook-form"

import type { ProtocolFormValues } from "@/features/protocols/schema"

export type NumericFieldName = FieldPathByValue<ProtocolFormValues, number>
export type ToggleFieldName = FieldPathByValue<ProtocolFormValues, boolean>

export const weightFields: Array<{ name: NumericFieldName; label: string; step: string }> = [
  { name: "maxWeightKg", label: "Max Weight (kg)", step: "0.1" },
  { name: "weightPercentage", label: "Weight Percentage (%)", step: "0.1" },
]

export const timingFields: Array<{ name: NumericFieldName; label: string; step: string }> = [
  { name: "setsPerHand", label: "Sets per Hand", step: "1" },
  { name: "workSeconds", label: "Work (seconds)", step: "0.1" },
  { name: "restSeconds", label: "Rest (seconds)", step: "0.1" },
  { name: "handSwitchSeconds", label: "Hand Switch (seconds)", step: "0.1" },
  { name: "countdownSeconds", label: "Countdown (seconds)", step: "0.1" },
]

export const toggleFields: Array<{ name: ToggleFieldName; label: string; description: string }> = [
  {
    name: "audioCues",
    label: "Audio Cues",
    description: "Play sounds on work and rest transitions.",
  },
  {
    name: "countdownBeeps",
    label: "Countdown Beeps",
    description: "Play beeps during countdown phases.",
  },
]
