import type { PenaltyLevel } from "../types/index.js";

export const PENALTY_DATA: PenaltyLevel[] = [
  {
    level: 1,
    minGap: 1,
    maxGap: 2,
    items: [
      { id: "L1-1", level: 1, name: "Whisper", description: "Say one compliment to the winner.", duration: 10, type: "verbal" },
      { id: "L1-2", level: 1, name: "Spark", description: "A quick celebratory high-five.", duration: 5, type: "action" }
    ]
  },
  {
    level: 2,
    minGap: 3,
    maxGap: 4,
    items: [
      { id: "L2-1", level: 2, name: "Contract", description: "Loser follows winner's next harmless command.", duration: 30, type: "action" },
      { id: "L2-2", level: 2, name: "Title", description: "Winner chooses loser's display title for one round.", duration: 30, type: "verbal" }
    ]
  },
  {
    level: 3,
    minGap: 5,
    maxGap: 6,
    items: [
      { id: "L3-1", level: 3, name: "Freeze", description: "Loser freezes for 20 seconds.", duration: 20, type: "physical" },
      { id: "L3-2", level: 3, name: "Blind Choice", description: "Loser picks an option blindfolded.", duration: 60, type: "visual" }
    ]
  },
  {
    level: 4,
    minGap: 7,
    maxGap: Number.POSITIVE_INFINITY,
    items: [
      { id: "L4-1", level: 4, name: "Oracle", description: "Winner decides one dramatic challenge.", duration: 120, type: "action" },
      { id: "L4-2", level: 4, name: "Command", description: "Loser performs a playful finale task.", duration: 180, type: "action" }
    ]
  }
];
