/** % do cupom gerado ao aprovar look (Influence Majesté). */
export const LOOK_REWARD_PERCENT = 10;

/** Sempre a taxa atual do programa Influence (não usa % antigo do registro). */
export function lookRewardPercent(_value?: number | null) {
  return LOOK_REWARD_PERCENT;
}
