import { useMemo, useRef, useState } from 'react';
import type { CharacterDefinition } from '../engine/battle/BattleEngine.types';
import type { AppPhase, BattleItemSlotSelection, QuestionScopeSelection, StageLaunchConfig } from '../base/base.types';
import { createEmptyDepartureDraft } from '../base/base.types';
import { buildStageLaunchConfig } from '../base/buildStageLaunchConfig';
import { validateDeparture } from '../base/departureValidation';
import { deriveQuestionCatalog } from '../base/questionScope';
import { resolveAreaStages } from '../base/areaResolution';
import { sampleAreas, sampleStagesById } from '../data/areas/sampleArea';
import { sampleParty } from '../data/characters/sampleCharacters';
import { sampleQuestions } from '../data/questions/sampleQuestions';
import { sampleDepartureItemCatalog, sampleDepartureItemCatalogById } from '../data/items/sampleDepartureItemCatalog';
import { StageSessionScreen } from './StageSessionScreen';
import { BaseHomeScreen } from '../ui/base/BaseHomeScreen';
import { AreaSelectScreen } from '../ui/base/AreaSelectScreen';
import { StageSelectScreen } from '../ui/base/StageSelectScreen';
import { DeparturePrepScreen } from '../ui/base/DeparturePrepScreen';
import { DepartureConfirmScreen } from '../ui/base/DepartureConfirmScreen';
import { PartyEditView } from '../ui/base/PartyEditView';
import { CharacterListView } from '../ui/base/CharacterListView';
import { CharacterDetailView } from '../ui/base/CharacterDetailView';
import { EquipmentListScreen } from '../ui/base/EquipmentListScreen';
import { InventoryListScreen } from '../ui/base/InventoryListScreen';
import { RecordScreen } from '../ui/base/RecordScreen';
import { createEmptyPermanentCharacterState, createProgressionSystem, expRequiredForLevel } from '../engine/progression/ProgressionSystem';
import type { EquipmentSlot, PermanentState, StageEndContext } from '../engine/progression/ProgressionSystem.types';
import { progressionConfig } from '../config/progressionConfig';
import { createSampleInitialPermanentState } from '../data/progression/createInitialPermanentState';
import { sampleEquipmentDefinitionsById } from '../data/equipment/sampleEquipment';
import { sampleEquipmentDropTablesById } from '../data/equipment/sampleDropTables';
import { sampleGrowthProfileByCharacterId } from '../data/progression/growthProfiles';
import { sampleCharacterUnlockRules, sampleStageUnlockRules } from '../data/progression/unlockRules';
import { createProductionInstanceIdFactory } from '../engine/progression/instanceId';
import { createEmptyLearningHistoryState, createLearningHistorySystem } from '../engine/learningHistory/LearningHistorySystem';
import type { LearningHistoryState, QuestionResult } from '../engine/learningHistory/LearningHistory.types';
import { createProductionLearningHistoryIdFactory } from '../engine/learningHistory/idFactory';
import { createSystemClock } from '../engine/learningHistory/clock';

const DEFAULT_RUN_SEED = 1;

/**
 * Single ProgressionSystem instance for the whole Base session (MVP-7),
 * mirroring how `useStageController.tsx` builds one stable `runResolver`
 * module-level instance — ProgressionSystem itself holds no mutable state,
 * only content-data bindings (CLAUDE.md §7 data-driven).
 */
const progressionSystem = createProgressionSystem({
  config: progressionConfig,
  growthProfileByCharacterId: sampleGrowthProfileByCharacterId,
  equipmentDefsById: sampleEquipmentDefinitionsById,
  equipmentDropTablesById: sampleEquipmentDropTablesById,
  characterUnlockRules: sampleCharacterUnlockRules,
  stageUnlockRules: sampleStageUnlockRules,
  instanceIdFactory: createProductionInstanceIdFactory(),
});

/**
 * Single LearningHistorySystem instance for the whole Base session (MVP-8,
 * mirroring `progressionSystem` above) — stateless aside from its injected
 * id/clock, never RandomService (user's explicit MVP-8 instruction: record
 * ids/timestamps must never consume or be affected by game randomness).
 */
const learningHistorySystem = createLearningHistorySystem({
  idFactory: createProductionLearningHistoryIdFactory(),
  clock: createSystemClock(),
});

/**
 * MVP-7 root controller (spec v0.7 §3/§10/§18.8, CLAUDE.md §6/§21): owns
 * screen navigation (`AppPhase`), the in-progress 出撃準備 draft
 * (`DepartureDraft`), and now `PermanentState` — the account-level
 * progression data ProgressionSystem reads/writes (level/EXP, equipment,
 * currency/materials, unlocks). SaveSystem/IndexedDB persistence is still
 * MVP-9 (user's explicit instruction) — `permanentState` lives in memory
 * only, seeded from `createSampleInitialPermanentState()`. `IN_STAGE` is
 * rendered by mounting `StageSessionScreen`, which is the only place
 * `useStageController` is ever called — this hook itself never calls it
 * conditionally (Rules of Hooks).
 */
export function useBaseController() {
  const [phase, setPhase] = useState<AppPhase>('BASE_HOME');
  const [draft, setDraft] = useState(createEmptyDepartureDraft());
  const [launchConfig, setLaunchConfig] = useState<StageLaunchConfig | null>(null);
  const [nextRunSeed, setNextRunSeed] = useState(DEFAULT_RUN_SEED);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [partyEditReturnPhase, setPartyEditReturnPhase] = useState<AppPhase>('BASE_HOME');
  const [isConfirmingDeparture, setIsConfirmingDeparture] = useState(false);
  const [permanentState, setPermanentState] = useState<PermanentState>(createSampleInitialPermanentState);
  // Independent from PermanentState (user's explicit MVP-8 instruction — never
  // merged into permanentState.characters/inventory). SaveSystem/IndexedDB
  // persistence for this is still MVP-9; it lives in memory only here.
  const [learningHistoryState, setLearningHistoryState] = useState<LearningHistoryState>(createEmptyLearningHistoryState);

  // Guards reconcileStageResult to exactly one application per Stage attempt
  // (MVP-7 decision doc §19: "StrictModeで二重付与されないように...イベント
  // ハンドラ上で1回だけ確定する構造を優先") — reset whenever a new Stage
  // attempt is launched, mirroring the existing isConfirmingDeparture guard.
  const hasReconciledCurrentStageRef = useRef(false);

  const questionCatalog = useMemo(() => deriveQuestionCatalog(sampleQuestions), []);
  // Canonical registry for resolving a LearningHistoryRecord.questionId back
  // to its QuestionDefinition (user's explicit MVP-8 instruction: the record
  // screen resolves against the FULL question catalog, not whatever subset a
  // past Stage's departure range happened to scope battles to — a record may
  // reference a question from a different Stage/range than the current one).
  const questionsById = useMemo(() => Object.fromEntries(sampleQuestions.map((q) => [q.id, q])), []);

  // Unlock-gated rosters (spec §10.7/§13, decision doc §12/§13). All three
  // existing MVP-1〜6 sample characters/the one sample stage are unlocked
  // from `createSampleInitialPermanentState()` by default — this filter is
  // a no-op today and only bites once locked content is added.
  const unlockedParty = useMemo(
    () => sampleParty.filter((c) => permanentState.unlockedCharacterIds.includes(c.id)),
    [permanentState.unlockedCharacterIds],
  );

  const selectedArea = draft.areaId ? (sampleAreas.find((a) => a.id === draft.areaId) ?? null) : null;
  const areaStages = useMemo(() => {
    if (!selectedArea) return [];
    return resolveAreaStages(selectedArea, sampleStagesById).filter((s) => permanentState.unlockedStageIds.includes(s.id));
  }, [selectedArea, permanentState.unlockedStageIds]);
  const selectedStage = draft.stageId ? (sampleStagesById[draft.stageId] ?? null) : null;

  const departureValidation = validateDeparture(draft, sampleQuestions, permanentState.inventory.consumables);

  function goHome() {
    setPhase('BASE_HOME');
  }

  function handleHotspotSelect(target: AppPhase) {
    if (target === 'PARTY_EDIT') setPartyEditReturnPhase('BASE_HOME');
    setPhase(target);
  }

  function handleSelectArea(areaId: string) {
    setDraft((d) => ({ ...d, areaId, stageId: null }));
    setPhase('STAGE_SELECT');
  }

  function handleSelectStage(stageId: string) {
    setDraft((d) => ({ ...d, stageId }));
    setPhase('DEPARTURE_PREP');
  }

  function handleOpenPartyEditFromPrep() {
    setPartyEditReturnPhase('DEPARTURE_PREP');
    setPhase('PARTY_EDIT');
  }

  function handleSaveParty(party: CharacterDefinition[]) {
    setDraft((d) => ({ ...d, party }));
    setPhase(partyEditReturnPhase);
  }

  function handleCancelPartyEdit() {
    setPhase(partyEditReturnPhase);
  }

  function handleChangeItemSlots(itemSlots: BattleItemSlotSelection) {
    setDraft((d) => ({ ...d, itemSlots }));
  }

  function handleChangeQuestionScope(questionScope: QuestionScopeSelection) {
    setDraft((d) => ({ ...d, questionScope }));
  }

  function handleProceedToConfirm() {
    if (!departureValidation.valid) return; // also enforced by the button's own disabled state
    setPhase('DEPARTURE_CONFIRM');
  }

  function handleConfirmDeparture() {
    if (isConfirmingDeparture) return; // idempotency guard (CLAUDE.md §13)
    if (!departureValidation.valid || !selectedStage) return;

    setIsConfirmingDeparture(true);
    hasReconciledCurrentStageRef.current = false;
    // Base Stats + Permanent Level Growth + Equipment (decision doc §18) —
    // resolved once here, before RunBuild's temporary bonuses ever enter the
    // picture. BattleEngine/StageEngine/RogueliteEngine only ever see the
    // already-resolved CharacterDefinition, never PermanentState itself.
    const resolvedParty = draft.party.map((c) => progressionSystem.resolveCharacterForBattle(c, permanentState));
    const config = buildStageLaunchConfig(
      { ...draft, party: resolvedParty },
      selectedStage,
      sampleQuestions,
      sampleDepartureItemCatalogById,
      nextRunSeed,
    );
    setNextRunSeed((seed) => seed + 1);
    setLaunchConfig(config);
    setPhase('IN_STAGE');
  }

  function handleReturnToBase(endContext: StageEndContext) {
    if (hasReconciledCurrentStageRef.current) return; // idempotency guard — reconcile exactly once per Stage attempt
    hasReconciledCurrentStageRef.current = true;

    const { permanentState: nextPermanentState } = progressionSystem.reconcileStageResult(permanentState, endContext);
    setPermanentState(nextPermanentState);
    setLaunchConfig(null);
    setIsConfirmingDeparture(false);
    setDraft(createEmptyDepartureDraft());
    setPhase('BASE_HOME');
  }

  function handleQuestionResult(result: QuestionResult) {
    setLearningHistoryState((s) => learningHistorySystem.recordAnswer(s, result));
  }

  function handleSelectCharacter(characterId: string) {
    setSelectedCharacterId(characterId);
    setPhase('CHARACTER_DETAIL');
  }

  function handleEquip(characterId: string, instanceId: string) {
    const result = progressionSystem.equipItem(permanentState, characterId, instanceId);
    if (result.success) setPermanentState(result.permanentState);
  }

  function handleUnequip(characterId: string, slot: EquipmentSlot) {
    setPermanentState((p) => progressionSystem.unequipSlot(p, characterId, slot));
  }

  function handleEnhance(instanceId: string) {
    const result = progressionSystem.enhanceEquipment(permanentState, instanceId);
    if (result.success) setPermanentState(result.permanentState);
  }

  function handleToggleLock(instanceId: string) {
    setPermanentState((p) => ({
      ...p,
      inventory: {
        ...p.inventory,
        equipment: p.inventory.equipment.map((i) => (i.instanceId === instanceId ? { ...i, locked: !i.locked } : i)),
      },
    }));
  }

  function handleDismantle(instanceIds: string[]) {
    const result = progressionSystem.dismantleEquipment(permanentState, instanceIds);
    if (result.success) setPermanentState(result.permanentState);
  }

  function renderDeparturePrep() {
    return (
      <DeparturePrepScreen
        draft={draft}
        questionCatalog={questionCatalog}
        itemCatalog={sampleDepartureItemCatalog}
        ownedQuantityById={permanentState.inventory.consumables}
        permanentState={permanentState}
        equipmentDefsById={sampleEquipmentDefinitionsById}
        validation={departureValidation}
        onEditParty={handleOpenPartyEditFromPrep}
        onChangeItemSlots={handleChangeItemSlots}
        onChangeQuestionScope={handleChangeQuestionScope}
        onBack={() => setPhase('STAGE_SELECT')}
        onProceed={handleProceedToConfirm}
      />
    );
  }

  switch (phase) {
    case 'BASE_HOME':
      return <BaseHomeScreen onSelect={handleHotspotSelect} />;

    case 'AREA_SELECT':
      return <AreaSelectScreen areas={sampleAreas} onSelect={handleSelectArea} onBack={goHome} />;

    case 'STAGE_SELECT':
      if (!selectedArea) return <AreaSelectScreen areas={sampleAreas} onSelect={handleSelectArea} onBack={goHome} />;
      return (
        <StageSelectScreen
          area={selectedArea}
          stages={areaStages}
          onSelect={handleSelectStage}
          onBack={() => setPhase('AREA_SELECT')}
        />
      );

    case 'DEPARTURE_PREP':
      return renderDeparturePrep();

    case 'DEPARTURE_CONFIRM':
      if (!selectedStage) return renderDeparturePrep();
      return (
        <DepartureConfirmScreen
          draft={draft}
          stage={selectedStage}
          questionPool={sampleQuestions}
          itemCatalogById={sampleDepartureItemCatalogById}
          confirming={isConfirmingDeparture}
          onConfirm={handleConfirmDeparture}
          onBack={() => setPhase('DEPARTURE_PREP')}
        />
      );

    case 'PARTY_EDIT':
      return (
        <PartyEditView
          roster={unlockedParty}
          selected={draft.party}
          onSave={handleSaveParty}
          onCancel={handleCancelPartyEdit}
        />
      );

    case 'CHARACTER_LIST':
      return <CharacterListView roster={unlockedParty} onSelect={handleSelectCharacter} onBack={goHome} />;

    case 'CHARACTER_DETAIL': {
      const character = unlockedParty.find((c) => c.id === selectedCharacterId);
      if (!character) return <CharacterListView roster={unlockedParty} onSelect={handleSelectCharacter} onBack={goHome} />;
      // UI input → engine command → result → UI renders (CLAUDE.md §9): the
      // resolved stats are computed once, here, via ProgressionSystem — the
      // view component itself only ever displays plain data, never calls
      // into the engine.
      const characterState = permanentState.characters[character.id] ?? createEmptyPermanentCharacterState(character.id);
      const resolvedCharacter = progressionSystem.resolveCharacterForBattle(character, permanentState);
      const nextLevelExpRequired = expRequiredForLevel(characterState.level, progressionConfig.expCurve);
      return (
        <CharacterDetailView
          character={character}
          characterState={characterState}
          resolvedBaseStats={resolvedCharacter.baseStats}
          nextLevelExpRequired={nextLevelExpRequired}
          equipmentDefsById={sampleEquipmentDefinitionsById}
          equipmentInstances={permanentState.inventory.equipment}
          onBack={() => setPhase('CHARACTER_LIST')}
        />
      );
    }

    case 'EQUIPMENT_LIST':
      return (
        <EquipmentListScreen
          permanentState={permanentState}
          equipmentDefsById={sampleEquipmentDefinitionsById}
          roster={unlockedParty}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
          onEnhance={handleEnhance}
          onToggleLock={handleToggleLock}
          onDismantle={handleDismantle}
          onBack={goHome}
        />
      );

    case 'INVENTORY_LIST':
      return (
        <InventoryListScreen
          permanentState={permanentState}
          itemCatalog={sampleDepartureItemCatalog}
          onBack={goHome}
        />
      );

    case 'RECORD_LIST':
      return <RecordScreen records={learningHistoryState.records} questionsById={questionsById} onBack={goHome} />;

    case 'IN_STAGE':
      // launchConfig is always set together with this phase (handleConfirmDeparture); this
      // fallback exists only as a defensive guard against an unreachable state, never as a
      // silent production fallback to sample data (user's explicit MVP-6 instruction).
      if (!launchConfig) return <BaseHomeScreen onSelect={handleHotspotSelect} />;
      return (
        <StageSessionScreen
          config={launchConfig}
          onReturnToBase={handleReturnToBase}
          onQuestionResult={handleQuestionResult}
        />
      );
  }
}
