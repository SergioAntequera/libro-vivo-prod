/**
 * @deprecated Care/rituales system has been deprecated.
 * These types are kept for backward compatibility with existing DB columns
 * but should not be used in new code. Use mood_state directly instead.
 */
export type CareAction = string;
export type CareMood = "wilted" | "healthy" | "shiny";
export type CareNeedKey = "water" | "light" | "soil" | "air";

export type CareNeedsState = Record<CareNeedKey, number>;

export type CareLogItem = {
  id: string;
  action: CareAction;
  by: string; // profile id
  at: string; // ISO date time
  note?: string;
};
