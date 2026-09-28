import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';
import { spellsById } from '../../data/spells/spellsById';

interface CharacterDetailViewProps {
  character: CharacterDefinition;
  onBack: () => void;
}

/**
 * キャラクター詳細 — MVP-6 range only (user's explicit instruction): 名前 /
 * HP / 学力 / 忍耐力 / 思考速度 / MP / 初期スペル(名前のみ). Never renders
 * `character.id`, `initialSpellId`, or `additionalSpellPoolIds` directly —
 * those are internal stable ids (CLAUDE.md §15), not player-facing text.
 * Unimplemented data (固有スキル/レベル/装備/解放条件) is simply omitted,
 * never fabricated (CLAUDE.md §24).
 */
export function CharacterDetailView({ character, onBack }: CharacterDetailViewProps) {
  const initialSpell = spellsById[character.initialSpellId];

  return (
    <div className="character-detail-view">
      <h1>{character.name}</h1>
      <dl className="character-detail-view__stats">
        <dt>HP</dt>
        <dd>{character.baseStats.maxHp}</dd>
        <dt>学力</dt>
        <dd>{character.baseStats.attack}</dd>
        <dt>忍耐力</dt>
        <dd>{character.baseStats.defense}</dd>
        <dt>思考速度</dt>
        <dd>{character.baseStats.speed}</dd>
        <dt>MP</dt>
        <dd>{character.baseStats.maxMp}</dd>
        <dt>初期スペル</dt>
        <dd>{initialSpell?.name ?? '不明'}</dd>
      </dl>
      <button type="button" onClick={onBack}>
        一覧へ戻る
      </button>
    </div>
  );
}
