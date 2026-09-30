import { describe, expect, it } from 'vitest';
import { resolveKnownSkill, type SkillDefinition } from '../../../src/engine/battle/skills';

describe('passive skill foundation', () => {
  const definition: SkillDefinition = {
    id: 'skill_test',
    name: 'テストスキル',
    trigger: 'TURN_START',
    description: 'ターン開始時に反応する。',
  };

  it('resolves a stable id into presentation-safe metadata', () => {
    expect(resolveKnownSkill(definition.id, { [definition.id]: definition })).toEqual({
      skillId: definition.id,
      name: definition.name,
      trigger: definition.trigger,
      description: definition.description,
    });
  });

  it('returns null for an unassigned or unknown skill id', () => {
    expect(resolveKnownSkill(undefined, { [definition.id]: definition })).toBeNull();
    expect(resolveKnownSkill('missing', { [definition.id]: definition })).toBeNull();
  });
});
