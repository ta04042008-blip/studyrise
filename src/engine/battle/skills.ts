export type SkillTrigger =
  | 'ALWAYS'
  | 'ZONE_START'
  | 'TURN_START'
  | 'TURN_END'
  | 'ATTACK_SUCCESS'
  | 'GUARD_SUCCESS'
  | 'CHARGE_SUCCESS'
  | 'SEARCH_SUCCESS'
  | 'SPELL_USED'
  | 'CRITICAL'
  | 'DAMAGE_TAKEN'
  | 'HP_THRESHOLD'
  | 'ALLY_KO'
  | 'ENEMY_KO'
  | 'MULTIPLE_ENEMIES'
  | 'BOSS_BATTLE';

/**
 * Stable, data-driven metadata for one character passive skill.
 *
 * Concrete gameplay effects are intentionally not part of this foundation
 * yet: the current formal spec says the initial three skill effects/values
 * are still undecided. Adding a new effect later must extend this definition
 * explicitly instead of hardcoding a character name/id inside BattleEngine.
 */
export interface SkillDefinition {
  id: string;
  name: string;
  trigger: SkillTrigger;
  description: string;
}

/** Resolved, presentation-safe skill metadata stored on BattleState. */
export interface KnownSkill {
  skillId: string;
  name: string;
  trigger: SkillTrigger;
  description: string;
}

/**
 * Presentation/event payload reserved for automatic passive activations.
 * No production skill emits this until its concrete effect is formally
 * specified.
 */
export interface SkillActivationEvent {
  sourceActorId: string;
  skillId: string;
  skillName: string;
  trigger: SkillTrigger;
  message: string;
}

export function resolveKnownSkill(
  skillId: string | undefined,
  skillsById: Record<string, SkillDefinition>,
): KnownSkill | null {
  if (!skillId) return null;
  const definition = skillsById[skillId];
  if (!definition) return null;
  return {
    skillId: definition.id,
    name: definition.name,
    trigger: definition.trigger,
    description: definition.description,
  };
}
