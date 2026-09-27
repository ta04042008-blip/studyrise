import type { BattleConfig } from '../../config/battleConfig';
import type { RandomService } from '../random/RandomService';

export interface DamageInput {
  attackerAttack: number;
  defenderDefense: number;
  /** ★-derived multiplier; enemy attacks (no question involved) pass 1. */
  starModifier: number;
}

export interface DamageResult {
  damage: number;
  isCritical: boolean;
}

/**
 * Implements the Attack damage formula from spec §5.6:
 *   finalDamage = (学力 - 忍耐力) × attackSpecificMultiplier × starModifier
 *                 × randomModifier × criticalModifier
 * with a minimum-damage floor (§5.6, value is a PLACEHOLDER — see battleConfig).
 */
export function calculateAttackDamage(
  input: DamageInput,
  config: BattleConfig,
  random: RandomService,
): DamageResult {
  const base = input.attackerAttack - input.defenderDefense;
  const randomModifier = random.uniform(config.damageVarianceMin, config.damageVarianceMax);
  const isCritical = random.chance(config.criticalChance);
  const criticalModifier = isCritical ? config.criticalMultiplier : 1;

  const raw =
    base * config.attackCommandMultiplier * input.starModifier * randomModifier * criticalModifier;

  const damage = Math.max(config.minimumDamage, Math.round(raw));

  return { damage, isCritical };
}
