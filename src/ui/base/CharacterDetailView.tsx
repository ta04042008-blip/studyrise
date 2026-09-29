import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';
import type { PlayerBaseStats } from '../../types/stats';
import type { EquipmentDefinition, EquipmentInstance, PermanentCharacterState } from '../../engine/progression/ProgressionSystem.types';
import { spellsById } from '../../data/spells/spellsById';
import { GameImage } from '../../presentation/assets/GameImage';
import { resolveCharacterArtPath } from '../../presentation/assets/studyRiseAssets';
import { resolveEquippedName } from './equipmentDisplay';

interface CharacterDetailViewProps {
  character: CharacterDefinition;
  /** Level/EXP (MVP-7 §10.1) — always resolved by the caller (useBaseController), never computed here (CLAUDE.md §9). */
  characterState: PermanentCharacterState;
  /** Base Stats + Permanent Level Growth + Equipment, already resolved (ProgressionSystem.resolveCharacterForBattle). */
  resolvedBaseStats: PlayerBaseStats;
  nextLevelExpRequired: number;
  equipmentDefsById: Record<string, EquipmentDefinition>;
  equipmentInstances: EquipmentInstance[];
  onBack: () => void;
}

const SLOT_LABELS = { weapon: '武器', armor: '防具', accessory: 'アクセサリー' } as const;

/**
 * キャラクター詳細 (spec v0.7 §14.2, MVP-7 decision doc §17): 名前 / HP /
 * 学力 / 忍耐力 / 思考速度 / MP / 初期スペル (MVP-6 baseline, unchanged) +
 * Level / 現在EXP / 次Lvまでの必要EXP / 恒久成長込みステータス / 装備中
 * weapon・armor・accessory (MVP-7 additions). Never renders `character.id`,
 * `initialSpellId`, or `additionalSpellPoolIds` directly (CLAUDE.md §15).
 * 固有スキル is still intentionally omitted — not implemented yet (MVP-7
 * decision doc §17: "固有スキルはまだ実装しないでください").
 */
export function CharacterDetailView({
  character,
  characterState,
  resolvedBaseStats,
  nextLevelExpRequired,
  equipmentDefsById,
  equipmentInstances,
  onBack,
}: CharacterDetailViewProps) {
  const initialSpell = spellsById[character.initialSpellId];
  const characterArtPath = resolveCharacterArtPath(character.id);

  return (
    <div className="character-detail-view">
      <h1>{character.name}</h1>
      <GameImage src={characterArtPath} alt={character.name} />

      <dl className="character-detail-view__level">
        <dt>Level</dt>
        <dd>{characterState.level}</dd>
        <dt>EXP</dt>
        <dd>
          {characterState.exp} / 次Lvまで {nextLevelExpRequired}
        </dd>
      </dl>

      <dl className="character-detail-view__stats">
        <dt>HP</dt>
        <dd>{resolvedBaseStats.maxHp}</dd>
        <dt>学力</dt>
        <dd>{resolvedBaseStats.attack}</dd>
        <dt>忍耐力</dt>
        <dd>{resolvedBaseStats.defense}</dd>
        <dt>思考速度</dt>
        <dd>{resolvedBaseStats.speed}</dd>
        <dt>MP</dt>
        <dd>{resolvedBaseStats.maxMp}</dd>
        <dt>初期スペル</dt>
        <dd>{initialSpell?.name ?? '不明'}</dd>
      </dl>

      <dl className="character-detail-view__equipment">
        <dt>{SLOT_LABELS.weapon}</dt>
        <dd>{resolveEquippedName(characterState.equipped.weaponInstanceId, equipmentInstances, equipmentDefsById)}</dd>
        <dt>{SLOT_LABELS.armor}</dt>
        <dd>{resolveEquippedName(characterState.equipped.armorInstanceId, equipmentInstances, equipmentDefsById)}</dd>
        <dt>{SLOT_LABELS.accessory}</dt>
        <dd>{resolveEquippedName(characterState.equipped.accessoryInstanceId, equipmentInstances, equipmentDefsById)}</dd>
      </dl>

      <button type="button" onClick={onBack}>
        一覧へ戻る
      </button>
    </div>
  );
}
