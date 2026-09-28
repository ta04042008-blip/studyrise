import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EquipmentListScreen } from '../../../src/ui/base/EquipmentListScreen';
import {
  makeEquipmentInstance,
  makeTestPermanentState,
  testAccessoryRare,
  testCharacterA,
  testCharacterB,
  testEquipmentDefsById,
  testWeaponLegendary,
  testWeaponNormal,
} from '../../engine/progression/fixtures';

afterEach(cleanup);

const roster = [testCharacterA, testCharacterB];

describe('EquipmentListScreen (spec §16, MVP-7 decision doc §16)', () => {
  it('lists owned equipment with slot / rarity / enhancement level / stat bonus', () => {
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id, enhancementLevel: 2 });
    const permanentState = makeTestPermanentState({ inventory: { equipment: [weapon], consumables: {} } });
    render(
      <EquipmentListScreen
        permanentState={permanentState}
        equipmentDefsById={testEquipmentDefsById}
        roster={roster}
        onEquip={() => {}}
        onUnequip={() => {}}
        onEnhance={() => {}}
        onToggleLock={() => {}}
        onDismantle={() => {}}
        onBack={() => {}}
      />,
    );
    expect(screen.getByText(/テスト用の剣.*武器.*ノーマル.*\+2/)).toBeTruthy();
    expect(screen.getByText('学力+9')).toBeTruthy(); // base attack+5, enhancement+2/level × Lv2
  });

  it('装備 button calls onEquip with the selected character and instance id', () => {
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const permanentState = makeTestPermanentState({ inventory: { equipment: [weapon], consumables: {} } });
    const onEquip = vi.fn();
    render(
      <EquipmentListScreen
        permanentState={permanentState}
        equipmentDefsById={testEquipmentDefsById}
        roster={roster}
        onEquip={onEquip}
        onUnequip={() => {}}
        onEnhance={() => {}}
        onToggleLock={() => {}}
        onDismantle={() => {}}
        onBack={() => {}}
      />,
    );
    // testCharacterA is selected by default (first in roster).
    fireEvent.click(screen.getByRole('button', { name: '装備' }));
    expect(onEquip).toHaveBeenCalledWith(testCharacterA.id, 'w1');
  });

  it('an instance already equipped elsewhere shows a disabled 装備 button', () => {
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const permanentState = makeTestPermanentState({
      characters: {
        [testCharacterA.id]: {
          characterId: testCharacterA.id,
          exp: 0,
          level: 1,
          equipped: { weaponInstanceId: 'w1', armorInstanceId: null, accessoryInstanceId: null },
        },
        [testCharacterB.id]: {
          characterId: testCharacterB.id,
          exp: 0,
          level: 1,
          equipped: { weaponInstanceId: null, armorInstanceId: null, accessoryInstanceId: null },
        },
      },
      inventory: { equipment: [weapon], consumables: {} },
    });
    render(
      <EquipmentListScreen
        permanentState={permanentState}
        equipmentDefsById={testEquipmentDefsById}
        roster={roster}
        onEquip={() => {}}
        onUnequip={() => {}}
        onEnhance={() => {}}
        onToggleLock={() => {}}
        onDismantle={() => {}}
        onBack={() => {}}
      />,
    );
    // Switch selection to testCharacterB, who does not have it equipped.
    fireEvent.click(screen.getByRole('button', { name: testCharacterB.name }));
    expect((screen.getByRole('button', { name: '装備' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('外す button calls onUnequip for the equipped slot', () => {
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const permanentState = makeTestPermanentState({
      characters: {
        [testCharacterA.id]: {
          characterId: testCharacterA.id,
          exp: 0,
          level: 1,
          equipped: { weaponInstanceId: 'w1', armorInstanceId: null, accessoryInstanceId: null },
        },
      },
      inventory: { equipment: [weapon], consumables: {} },
    });
    const onUnequip = vi.fn();
    render(
      <EquipmentListScreen
        permanentState={permanentState}
        equipmentDefsById={testEquipmentDefsById}
        roster={[testCharacterA]}
        onEquip={() => {}}
        onUnequip={onUnequip}
        onEnhance={() => {}}
        onToggleLock={() => {}}
        onDismantle={() => {}}
        onBack={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '外す' }));
    expect(onUnequip).toHaveBeenCalledWith(testCharacterA.id, 'weapon');
  });

  it('強化 button shows the cost and calls onEnhance', () => {
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const permanentState = makeTestPermanentState({ inventory: { equipment: [weapon], consumables: {} } });
    const onEnhance = vi.fn();
    render(
      <EquipmentListScreen
        permanentState={permanentState}
        equipmentDefsById={testEquipmentDefsById}
        roster={roster}
        onEquip={() => {}}
        onUnequip={() => {}}
        onEnhance={onEnhance}
        onToggleLock={() => {}}
        onDismantle={() => {}}
        onBack={() => {}}
      />,
    );
    const enhanceButton = screen.getByRole('button', { name: /強化（/ });
    fireEvent.click(enhanceButton);
    expect(onEnhance).toHaveBeenCalledWith('w1');
  });

  it('shows 強化上限 once a weapon has reached its rarity cap', () => {
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id, enhancementLevel: 5 }); // NORMAL cap
    const permanentState = makeTestPermanentState({ inventory: { equipment: [weapon], consumables: {} } });
    render(
      <EquipmentListScreen
        permanentState={permanentState}
        equipmentDefsById={testEquipmentDefsById}
        roster={roster}
        onEquip={() => {}}
        onUnequip={() => {}}
        onEnhance={() => {}}
        onToggleLock={() => {}}
        onDismantle={() => {}}
        onBack={() => {}}
      />,
    );
    expect((screen.getByRole('button', { name: '強化上限' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('ロック toggles via onToggleLock', () => {
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id, locked: false });
    const permanentState = makeTestPermanentState({ inventory: { equipment: [weapon], consumables: {} } });
    const onToggleLock = vi.fn();
    render(
      <EquipmentListScreen
        permanentState={permanentState}
        equipmentDefsById={testEquipmentDefsById}
        roster={roster}
        onEquip={() => {}}
        onUnequip={() => {}}
        onEnhance={() => {}}
        onToggleLock={onToggleLock}
        onDismantle={() => {}}
        onBack={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'ロック' }));
    expect(onToggleLock).toHaveBeenCalledWith('w1');
  });

  it('分解 is disabled until at least one item is checked, then calls onDismantle for a NORMAL item without confirmation', () => {
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const permanentState = makeTestPermanentState({ inventory: { equipment: [weapon], consumables: {} } });
    const onDismantle = vi.fn();
    render(
      <EquipmentListScreen
        permanentState={permanentState}
        equipmentDefsById={testEquipmentDefsById}
        roster={roster}
        onEquip={() => {}}
        onUnequip={() => {}}
        onEnhance={() => {}}
        onToggleLock={() => {}}
        onDismantle={onDismantle}
        onBack={() => {}}
      />,
    );
    const dismantleButton = screen.getByRole('button', { name: '選択した装備を分解' });
    expect((dismantleButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('checkbox', { name: /テスト用の剣を選択/ }));
    fireEvent.click(screen.getByRole('button', { name: '選択した装備を分解' }));
    expect(onDismantle).toHaveBeenCalledWith(['w1']);
  });

  it('分解 requires a second confirming tap for a high-rarity (EPIC/LEGENDARY) item (spec §10.5)', () => {
    const legendaryWeapon = makeEquipmentInstance({ instanceId: 'w_legendary', definitionId: testWeaponLegendary.id });
    const permanentState = makeTestPermanentState({ inventory: { equipment: [legendaryWeapon], consumables: {} } });
    const onDismantle = vi.fn();
    render(
      <EquipmentListScreen
        permanentState={permanentState}
        equipmentDefsById={testEquipmentDefsById}
        roster={roster}
        onEquip={() => {}}
        onUnequip={() => {}}
        onEnhance={() => {}}
        onToggleLock={() => {}}
        onDismantle={onDismantle}
        onBack={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /テスト用の伝説の剣を選択/ }));
    fireEvent.click(screen.getByRole('button', { name: '選択した装備を分解' }));
    expect(onDismantle).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '本当に分解する（高レア含む）' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '本当に分解する（高レア含む）' }));
    expect(onDismantle).toHaveBeenCalledWith(['w_legendary']);
  });

  it('bulk-selects multiple items and dismantles all their instanceIds together (no per-item confirmation needed for NORMAL/RARE)', () => {
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const accessory = makeEquipmentInstance({ instanceId: 'r1', definitionId: testAccessoryRare.id });
    const permanentState = makeTestPermanentState({ inventory: { equipment: [weapon, accessory], consumables: {} } });
    const onDismantle = vi.fn();
    render(
      <EquipmentListScreen
        permanentState={permanentState}
        equipmentDefsById={testEquipmentDefsById}
        roster={roster}
        onEquip={() => {}}
        onUnequip={() => {}}
        onEnhance={() => {}}
        onToggleLock={() => {}}
        onDismantle={onDismantle}
        onBack={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /テスト用の剣を選択/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /テスト用の指輪を選択/ }));
    fireEvent.click(screen.getByRole('button', { name: '選択した装備を分解' }));
    expect(onDismantle).toHaveBeenCalledWith(expect.arrayContaining(['w1', 'r1']));
  });

  it('拠点へ戻る calls onBack', () => {
    const permanentState = makeTestPermanentState();
    const onBack = vi.fn();
    render(
      <EquipmentListScreen
        permanentState={permanentState}
        equipmentDefsById={testEquipmentDefsById}
        roster={roster}
        onEquip={() => {}}
        onUnequip={() => {}}
        onEnhance={() => {}}
        onToggleLock={() => {}}
        onDismantle={() => {}}
        onBack={onBack}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onBack).toHaveBeenCalled();
  });
});
