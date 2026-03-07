import type { FieldPathByValue } from "react-hook-form";

import type { ProtocolFormValues } from "@/features/protocols/schema";

export type NumericFieldName = FieldPathByValue<ProtocolFormValues, number>
export type ToggleFieldName = FieldPathByValue<ProtocolFormValues, boolean>

export interface NumericFieldDefinition {
  name: NumericFieldName
  label: string
  step: string
}

export interface NumericFieldGroupDefinition {
  title: string
  description: string
  fields: NumericFieldDefinition[]
}

export const weightFields: NumericFieldDefinition[] = [
  { name: "maxWeightKg", label: "Max Weight (kg)", step: "0.1" },
  { name: "weightPercentage", label: "Weight Percentage (%)", step: "0.1" },
];

export const timingFieldGroups: NumericFieldGroupDefinition[] = [
  {
    title: "Start",
    description: "Before the first rep begins.",
    fields: [
      { name: "countdownSeconds", label: "Countdown (seconds)", step: "0.1" },
    ],
  },
  {
    title: "Structure",
    description: "How the session is organized.",
    fields: [
      { name: "repsPerSet", label: "Reps per Set", step: "1" },
      { name: "numberOfSets", label: "Number of Sets", step: "1" },
    ],
  },
  {
    title: "Intervals",
    description: "Durations during and between efforts.",
    fields: [
      { name: "workSeconds", label: "Work (seconds)", step: "0.1" },
      { name: "restSeconds", label: "Rest (seconds)", step: "0.1" },
      { name: "handSwitchSeconds", label: "Hand Switch (seconds)", step: "0.1" },
      { name: "setRestSeconds", label: "Set Rest (minutes)", step: "0.5" },
    ],
  },
];

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
];
