import { useState } from 'react';
import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';
import type { EquipmentDefinition, EquipmentSlot, PermanentState } from '../../engine/progression/ProgressionSystem.types';
import { computeSingleEquipmentStatBonus, isEquippedByAnyCharacter, previewEnhancementCost } from '../../engine/progression/ProgressionSystem';
import { progressionConfig, CURRENCY_LABEL, UPGRADE_MATERIAL_LABEL, UPGRADE_MATERIAL_ID } from '../../config/progressionConfig';
import { rarityLabel } from '../roguelite/rarityLabel';

interface EquipmentListScreenProps {
  permanentState: PermanentState;
  equipmentDefsById: Record<string, EquipmentDefinition>;
  roster: CharacterDefinition[];
  onEquip: (characterId: string, instanceId: string) => void;
  onUnequip: (characterId: string, slot: EquipmentSlot) => void;
  onEnhance: (instanceId: string) => void;
  onToggleLock: (instanceId: string) => void;
  onDismantle: (instanceIds: string[]) => void;
  onBack: () => void;
}

const SLOT_LABELS: Record<EquipmentSlot, string> = { weapon: '武器', armor: '防具', accessory: 'アクセサリー' };
const STAT_BONUS_LABELS = { hp: 'HP', attack: '学力', defense: '忍耐力', speed: '思考速度' } as const;
/** Spec §10.5: 分解 confirms before destroying a high-rarity item. */
const HIGH_RARITY_CONFIRM = new Set(['EPIC', 'LEGENDARY']);

function formatStatBonus(bonus: Record<string, number>): string {
  const parts = (Object.keys(STAT_BONUS_LABELS) as (keyof typeof STAT_BONUS_LABELS)[])
    .filter((key) => bonus[key])
    .map((key) => `${STAT_BONUS_LABELS[key]}+${bonus[key]}`);
  return parts.length > 0 ? parts.join(' ') : 'なし';
}

/**
 * 装備 (spec §10.2-§10.5/§16, MVP-7 decision doc §16): 所持装備一覧
 * （rarity/slot/強化Lv/ステータス補正/lock）、装備/外す/強化/分解。Slot
 * matching is the only equip restriction (decision doc §7 — no
 * allowedCharacterIds/requiredLevel in MVP-7). Presentation + dispatch only
 * (CLAUDE.md §9) — every action just calls the handler ProgressionSystem
 * ultimately resolves in useBaseController.
 */
export function EquipmentListScreen({
  permanentState,
  equipmentDefsById,
  roster,
  onEquip,
  onUnequip,
  onEnhance,
  onToggleLock,
  onDismantle,
  onBack,
}: EquipmentListScreenProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(roster[0]?.id ?? null);
  const [checkedInstanceIds, setCheckedInstanceIds] = useState<Set<string>>(new Set());
  const [confirmingDismantle, setConfirmingDismantle] = useState(false);

  const selectedCharacter = roster.find((c) => c.id === selectedCharacterId) ?? null;
  const selectedCharacterState = selectedCharacterId ? permanentState.characters[selectedCharacterId] : undefined;

  function toggleChecked(instanceId: string) {
    setConfirmingDismantle(false);
    setCheckedInstanceIds((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
  }

  function handleDismantleClick() {
    const ids = [...checkedInstanceIds];
    if (ids.length === 0) return;
    const needsConfirm = ids.some((id) => {
      const instance = permanentState.inventory.equipment.find((i) => i.instanceId === id);
      const def = instance ? equipmentDefsById[instance.definitionId] : undefined;
      return def && HIGH_RARITY_CONFIRM.has(def.rarity);
    });
    if (needsConfirm && !confirmingDismantle) {
      setConfirmingDismantle(true);
      return;
    }
    onDismantle(ids);
    setCheckedInstanceIds(new Set());
    setConfirmingDismantle(false);
  }

  return (
    <div className="equipment-list-screen">
      <h1>装備</h1>
      <p>
        {CURRENCY_LABEL}: {permanentState.currency} / {UPGRADE_MATERIAL_LABEL}: {permanentState.materials[UPGRADE_MATERIAL_ID] ?? 0}
      </p>

      <section>
        <h2>キャラクター</h2>
        <ul className="equipment-list-screen__character-select">
          {roster.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setSelectedCharacterId(c.id)} aria-pressed={c.id === selectedCharacterId}>
                {c.name}
              </button>
            </li>
          ))}
        </ul>

        {selectedCharacter && selectedCharacterState && (
          <dl className="equipment-list-screen__equipped-slots">
            {(['weapon', 'armor', 'accessory'] as const).map((slot) => {
              const slotKey = `${slot}InstanceId` as const;
              const instanceId = selectedCharacterState.equipped[slotKey];
              const instance = instanceId ? permanentState.inventory.equipment.find((i) => i.instanceId === instanceId) : undefined;
              const def = instance ? equipmentDefsById[instance.definitionId] : undefined;
              return (
                <div key={slot}>
                  <dt>{SLOT_LABELS[slot]}</dt>
                  <dd>
                    {def && instance ? `${def.name} +${instance.enhancementLevel}` : '未装備'}
                    {instanceId && (
                      <button type="button" onClick={() => onUnequip(selectedCharacter.id, slot)}>
                        外す
                      </button>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </section>

      <section>
        <h2>所持装備一覧</h2>
        <ul className="equipment-list-screen__inventory">
          {permanentState.inventory.equipment.map((instance) => {
            const def = equipmentDefsById[instance.definitionId];
            if (!def) return null;
            const statBonus = computeSingleEquipmentStatBonus(instance, def);
            const enhancementPreview = previewEnhancementCost(instance, def, progressionConfig);
            const equippedElsewhere = isEquippedByAnyCharacter(permanentState, instance.instanceId);
            const canEquipToSelected = !!selectedCharacter && !equippedElsewhere;

            return (
              <li key={instance.instanceId} className="equipment-list-screen__item">
                <input
                  type="checkbox"
                  aria-label={`${def.name}を選択`}
                  checked={checkedInstanceIds.has(instance.instanceId)}
                  onChange={() => toggleChecked(instance.instanceId)}
                />
                <span>
                  {def.name}（{SLOT_LABELS[def.slot]} / {rarityLabel(def.rarity)} / +{instance.enhancementLevel}）
                </span>
                <span>{formatStatBonus(statBonus)}</span>
                <span>{instance.locked ? 'ロック中' : ''}</span>

                {selectedCharacter && (
                  <EquipButton
                    canEquip={canEquipToSelected}
                    onClick={() => onEquip(selectedCharacter.id, instance.instanceId)}
                  />
                )}

                <button type="button" disabled={!enhancementPreview} onClick={() => onEnhance(instance.instanceId)}>
                  {enhancementPreview
                    ? `強化（${CURRENCY_LABEL}${enhancementPreview.currencyCost} / ${UPGRADE_MATERIAL_LABEL}${enhancementPreview.materialCost}）`
                    : '強化上限'}
                </button>
                <button type="button" onClick={() => onToggleLock(instance.instanceId)}>
                  {instance.locked ? 'ロック解除' : 'ロック'}
                </button>
              </li>
            );
          })}
        </ul>

        <button type="button" disabled={checkedInstanceIds.size === 0} onClick={handleDismantleClick}>
          {confirmingDismantle ? '本当に分解する（高レア含む）' : '選択した装備を分解'}
        </button>
      </section>

      <button type="button" onClick={onBack}>
        拠点へ戻る
      </button>
    </div>
  );
}

function EquipButton({ canEquip, onClick }: { canEquip: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={!canEquip} onClick={onClick}>
      装備
    </button>
  );
}
