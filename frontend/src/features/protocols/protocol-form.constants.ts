import type { FieldPathByValue } from "react-hook-form";

import type { ProtocolFormValues } from "@/features/protocols/schema";

export type NumericFieldName = FieldPathByValue<ProtocolFormValues, number>
export type ToggleFieldName = FieldPathByValue<ProtocolFormValues, boolean>

export interface NumericFieldDefinition {
  name: NumericFieldName
  label: string
  step: string
  description?: string
}

export const protocolNumericFields: Record<NumericFieldName, NumericFieldDefinition> = {
  maxWeightKg: { name: "maxWeightKg", label: "Max Weight (kg)", step: "0.1" },
  weightPercentage: { name: "weightPercentage", label: "Weight Percentage (%)", step: "0.1" },
  repsPerSet: { name: "repsPerSet", label: "Reps per hand", step: "1" },
  numberOfSets: { name: "numberOfSets", label: "Sets", step: "1" },
  workSeconds: { name: "workSeconds", label: "Work", step: "0.1" },
  restSeconds: { name: "restSeconds", label: "Rest", step: "0.1" },
  handSwitchSeconds: {
    name: "handSwitchSeconds",
    label: "Hand switch",
    step: "0.1",
    description: "Seconds to move to the other hand.",
  },
  setRestSeconds: {
    name: "setRestSeconds",
    label: "Set rest",
    step: "0.5",
    description: "Minutes before the next full set starts.",
  },
  countdownSeconds: {
    name: "countdownSeconds",
    label: "Countdown",
    step: "0.1",
    description: "Seconds before the timer starts.",
  },
};

export const weightFields: NumericFieldDefinition[] = [
  protocolNumericFields.maxWeightKg,
  protocolNumericFields.weightPercentage,
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
