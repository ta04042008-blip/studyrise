import { useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterDefinition } from '../engine/battle/BattleEngine.types';
import type { AppPhase, BattleItemSlotSelection, QuestionScopeSelection, StageLaunchConfig } from '../base/base.types';
import { createEmptyDepartureDraft } from '../base/base.types';
import { buildStageLaunchConfig } from '../base/buildStageLaunchConfig';
import { buildResumedStageLaunchConfig } from '../base/buildResumedStageLaunchConfig';
import { isRunSaveCompatibleWithCurrentContent } from '../base/runSaveCompatibility';
import { validateDeparture } from '../base/departureValidation';
import { deriveQuestionCatalog } from '../base/questionScope';
import { resolveAreaStages } from '../base/areaResolution';
import { sampleAreas, sampleStagesById } from '../data/areas/sampleArea';
import { enemyDefinitionsById } from '../data/enemies/enemyDefinitionsById';
import { sampleParty } from '../data/characters/sampleCharacters';
import { sampleQuestions } from '../data/questions/sampleQuestions';
import { officialQuestions } from '../data/questions/officialQuestions';
import { sampleDepartureItemCatalog, sampleDepartureItemCatalogById } from '../data/items/sampleDepartureItemCatalog';
import { StageSessionScreen } from './StageSessionScreen';
import type { RunProgressUpdate, UseStageControllerSaveHooks } from './useStageController';
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
import { BootLoadingScreen } from '../ui/base/BootLoadingScreen';
import { RunResumeChoiceScreen } from '../ui/base/RunResumeChoiceScreen';
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
import { createIndexedDbSaveRepository } from '../engine/save/IndexedDbSaveRepository';
import { createSaveSystem, type SaveSystem } from '../engine/save/SaveSystem';
import { RUN_CHECKPOINT_TIERS, type RunCheckpointTier } from '../engine/save/SaveRepository';
import type { RunSavePayload } from '../engine/save/RunSave';

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
 * Production SaveSystem (MVP-9): IndexedDB-backed, constructed once for the
 * whole app. `useBaseController` never touches `IndexedDbSaveRepository`
 * directly — only through the storage-agnostic `SaveSystem`/`SaveRepository`
 * interfaces (CLAUDE.md §21/§30), so a future `CloudSaveRepository` can
 * replace it without this file changing. Tests inject their own SaveSystem
 * (typically InMemorySaveRepository-backed) via `useBaseController`'s
 * `overrides.saveSystem` instead of touching this singleton.
 */
const defaultSaveSystem = createSaveSystem({
  repository: createIndexedDbSaveRepository(),
  clock: createSystemClock(),
});

/** The static, never-changes-mid-attempt parts of a RunSavePayload — everything else (stageRunState/liveBattleSnapshot/liveRewardSnapshot) is supplied per save-event by useStageController's saveHooks. */
interface RunStaticParts {
  areaId: string;
  stageId: string;
  resolvedParty: CharacterDefinition[];
  questionScope: QuestionScopeSelection;
  itemSlotSelection: BattleItemSlotSelection;
}

const ALL_RUN_TIERS: RunCheckpointTier[] = [...RUN_CHECKPOINT_TIERS];

export interface UseBaseControllerOptions {
  /** Test-only injection point (MVP-9) — production always uses the IndexedDB-backed default. */
  saveSystem?: SaveSystem;
}

/**
 * MVP-9 root controller (spec §15/§18.12, CLAUDE.md §6/§21): owns screen
 * navigation (`AppPhase`), the in-progress 出撃準備 draft (`DepartureDraft`),
 * `PermanentState`, `LearningHistoryState`, and now the SaveSystem
 * boot/autosave/resume lifecycle. `IN_STAGE` is rendered by mounting
 * `StageSessionScreen`, which is the only place `useStageController` is
 * ever called — this hook itself never calls it conditionally (Rules of
 * Hooks).
 */
export function useBaseController(options?: UseBaseControllerOptions) {
  const saveSystem = options?.saveSystem ?? defaultSaveSystem;

  const [phase, setPhase] = useState<AppPhase>('BOOT_LOADING');
  const [draft, setDraft] = useState(createEmptyDepartureDraft());
  const [launchConfig, setLaunchConfig] = useState<StageLaunchConfig | null>(null);
  const [nextRunSeed, setNextRunSeed] = useState(DEFAULT_RUN_SEED);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [partyEditReturnPhase, setPartyEditReturnPhase] = useState<AppPhase>('BASE_HOME');
  const [isConfirmingDeparture, setIsConfirmingDeparture] = useState(false);
  const [permanentState, setPermanentState] = useState<PermanentState>(createSampleInitialPermanentState);
  // Independent from PermanentState (user's explicit MVP-8 instruction — never
  // merged into permanentState.characters/inventory).
  const [learningHistoryState, setLearningHistoryState] = useState<LearningHistoryState>(createEmptyLearningHistoryState);
  // MVP-9: a RunSave checkpoint found at boot, awaiting the player's
  // resume/discard choice (spec §15.2 — never auto-jump into it).
  const [pendingRunSave, setPendingRunSave] = useState<{ tier: RunCheckpointTier; payload: RunSavePayload } | null>(null);

  // Guards reconcileStageResult to exactly one application per Stage attempt
  // (MVP-7 decision doc §19: "StrictModeで二重付与されないように...イベント
  // ハンドラ上で1回だけ確定する構造を優先") — reset whenever a new Stage
  // attempt is launched, mirroring the existing isConfirmingDeparture guard.
  const hasReconciledCurrentStageRef = useRef(false);

  // MVP-9: always mirrors the latest learningHistoryState, so a RunSave
  // autosave triggered synchronously right after a just-recorded answer
  // (see handleQuestionResult) bundles the fresh value atomically, even
  // though the state itself hasn't re-rendered yet (CLAUDE.md §13/user's
  // explicit "回答確定のatomic save" instruction).
  const learningHistoryStateRef = useRef(learningHistoryState);
  learningHistoryStateRef.current = learningHistoryState;

  // MVP-9: the static parts of the currently in-progress Stage attempt's
  // RunSavePayload (set once at departure/resume, cleared at Stage finalize)
  // — see RunStaticParts.
  const runStaticPartsRef = useRef<RunStaticParts | null>(null);
  // MVP-9: set only when entering IN_STAGE via "途中から再開" — read exactly
  // once by StageSessionScreen's saveHooks.resumeFrom.
  const resumeFromRef = useRef<{
    stageRunState: RunSavePayload['stageRunState'];
    liveBattleSnapshot: RunSavePayload['liveBattleSnapshot'];
    liveRewardSnapshot: RunSavePayload['liveRewardSnapshot'];
  } | null>(null);

  // MVP-9 boot flow: load PermanentSave/LearningHistorySave/RunSave before
  // ever showing Base/Stage (user's explicit instruction — never flash
  // pre-load UI). A genuine one-time async I/O bootstrap, not a generic
  // state-change watcher (CLAUDE.md §18/§28) — `cancelled` guards against
  // StrictMode's dev-only double-invoke applying a stale/duplicate result.
  useEffect(() => {
    let cancelled = false;
    saveSystem
      .loadBoot((payload) => isRunSaveCompatibleWithCurrentContent(payload, sampleStagesById, enemyDefinitionsById, officialQuestions))
      .then((boot) => {
        if (cancelled) return;
        if (boot.permanent) setPermanentState(boot.permanent);
        if (boot.learningHistory) setLearningHistoryState(boot.learningHistory);
        if (boot.run) {
          setPendingRunSave(boot.run);
          setPhase('RUN_RESUME_CHOICE');
        } else {
          setPhase('BASE_HOME');
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const questionCatalog = useMemo(() => deriveQuestionCatalog(officialQuestions), []);
  // Canonical registry for resolving a LearningHistoryRecord.questionId back
  // to its QuestionDefinition (user's explicit MVP-8 instruction: the record
  // screen resolves against the FULL question catalog, not whatever subset a
  // past Stage's departure range happened to scope battles to — a record may
  // reference a question from a different Stage/range than the current one).
  const questionsById = useMemo(() => Object.fromEntries([...sampleQuestions, ...officialQuestions].map((q) => [q.id, q])), []);

  // Unlock-gated rosters (spec §10.7/§13, decision doc §12/§13). All three
  // existing MVP-1〜6 sample characters/the one sample stage are unlocked
  // from `createSampleInitialPermanentState()` by default — this filter is
  // a no-op today and only bites once locked content is added.
  const unlockedParty = useMemo(
    () => sampleParty.filter((c) => permanentState.unlockedCharacterIds.includes(c.id)),
    [permanentState.unlockedCharacterIds],
  );

  const savedParty = useMemo(() => {
    const unlockedById = new Map(unlockedParty.map((character) => [character.id, character]));
    return (permanentState.savedPartyCharacterIds ?? [])
      .map((characterId) => unlockedById.get(characterId))
      .filter((character): character is CharacterDefinition => character !== undefined)
      .slice(0, 3);
  }, [permanentState.savedPartyCharacterIds, unlockedParty]);

  // A fresh/legacy save may not have a stored party yet. Base still needs a
  // visible representative, so only the home presentation falls back to the
  // first unlocked character; departure itself remains invalid until a party
  // is explicitly saved/selected.
  const baseLeader = savedParty[0] ?? unlockedParty[0] ?? null;

  const selectedArea = draft.areaId ? (sampleAreas.find((a) => a.id === draft.areaId) ?? null) : null;
  const areaStages = useMemo(() => {
    if (!selectedArea) return [];
    return resolveAreaStages(selectedArea, sampleStagesById).filter((s) => permanentState.unlockedStageIds.includes(s.id));
  }, [selectedArea, permanentState.unlockedStageIds]);
  const selectedStage = draft.stageId ? (sampleStagesById[draft.stageId] ?? null) : null;

  const departureValidation = validateDeparture(draft, officialQuestions, permanentState.inventory.consumables);

  // ---------------------------------------------------------------------
  // MVP-9 save-event handlers — the only place useBaseController talks to
  // SaveSystem (CLAUDE.md §21: no component/hook below this one ever does).
  // ---------------------------------------------------------------------

  function buildRunSavePayload(
    stageRunState: RunSavePayload['stageRunState'],
    liveBattleSnapshot: RunSavePayload['liveBattleSnapshot'],
    liveRewardSnapshot: RunSavePayload['liveRewardSnapshot'],
  ): RunSavePayload | null {
    const staticParts = runStaticPartsRef.current;
    if (!staticParts) return null; // defensive only — never true while IN_STAGE
    return { ...staticParts, stageRunState, liveBattleSnapshot, liveRewardSnapshot };
  }

  function handleStageStart(stageRunState: RunSavePayload['stageRunState']) {
    const payload = buildRunSavePayload(stageRunState, null, null);
    if (!payload) return;
    saveSystem.commit({ runWrites: { stageStart: payload, zoneStart: payload, live: payload } });
  }

  function handleZoneStart(stageRunState: RunSavePayload['stageRunState']) {
    const payload = buildRunSavePayload(stageRunState, null, null);
    if (!payload) return;
    saveSystem.commit({ runWrites: { zoneStart: payload, live: payload } });
  }

  function handleRunProgress(update: RunProgressUpdate) {
    const payload = buildRunSavePayload(update.stageRunState, update.liveBattleSnapshot, update.liveRewardSnapshot);
    if (!payload) return;
    // Bundled with the current LearningHistoryState on every call (not only
    // when a record was just added) — always-correct and trivially atomic
    // with an answer-confirm event, at the cost of an occasional harmless
    // redundant re-write of an unchanged history (CLAUDE.md §13/user's
    // explicit instruction: 回答確定 must never leave History and Run out
    // of sync).
    saveSystem.commit({ learningHistory: learningHistoryStateRef.current, runWrites: { live: payload } });
  }

  const stageSaveHooks: UseStageControllerSaveHooks = {
    resumeFrom: resumeFromRef.current ?? undefined,
    onStageStart: handleStageStart,
    onZoneStart: handleZoneStart,
    onProgressChange: handleRunProgress,
  };

  function goHome() {
    setPhase('BASE_HOME');
  }

  function handleBaseNavSelect(target: AppPhase) {
    if (target === 'PARTY_EDIT') setPartyEditReturnPhase('BASE_HOME');
    if (target === 'AREA_SELECT' && savedParty.length > 0) {
      setDraft((current) => ({ ...current, party: savedParty }));
    }
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
    const nextPermanentState: PermanentState = {
      ...permanentState,
      savedPartyCharacterIds: party.map((character) => character.id),
    };
    setPermanentState(nextPermanentState);
    setDraft((d) => ({ ...d, party }));
    void saveSystem.commit({ permanent: nextPermanentState });
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
    if (!departureValidation.valid || !selectedStage || !draft.areaId) return;

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
      officialQuestions,
      sampleDepartureItemCatalogById,
      nextRunSeed,
    );
    // MVP-9: a fresh departure — never carries a resumed snapshot, and its
    // RunSavePayload's static parts are exactly this confirmed draft.
    resumeFromRef.current = null;
    runStaticPartsRef.current = {
      areaId: draft.areaId,
      stageId: selectedStage.id,
      resolvedParty,
      questionScope: draft.questionScope,
      itemSlotSelection: draft.itemSlots,
    };
    setNextRunSeed((seed) => seed + 1);
    setLaunchConfig(config);
    setPhase('IN_STAGE');
  }

  function handleReturnToBase(endContext: StageEndContext) {
    if (hasReconciledCurrentStageRef.current) return; // idempotency guard — reconcile exactly once per Stage attempt
    hasReconciledCurrentStageRef.current = true;

    const { permanentState: nextPermanentState } = progressionSystem.reconcileStageResult(permanentState, endContext);
    setPermanentState(nextPermanentState);
    // MVP-9: PermanentState + LearningHistoryState + clearing every Run tier
    // all land in ONE atomic transaction (user's explicit instruction §15) —
    // a reload can never see the permanent reward applied with the Run
    // checkpoint still present (which would double-grant on a later
    // "拠点へ戻る"), nor the Run checkpoint gone with the reward lost.
    void saveSystem.commit({
      permanent: nextPermanentState,
      learningHistory: learningHistoryStateRef.current,
      clearRunTiers: ALL_RUN_TIERS,
    });
    runStaticPartsRef.current = null;
    resumeFromRef.current = null;
    setLaunchConfig(null);
    setIsConfirmingDeparture(false);
    setDraft(createEmptyDepartureDraft());
    setPhase('BASE_HOME');
  }

  function handleQuestionResult(result: QuestionResult) {
    // Value-based (not a `setState(prev => ...)` functional updater) so the
    // ref is updated synchronously, before any subsequent onProgressChange
    // in the same submitAnswer() call reads it (see handleRunProgress) —
    // mirrors useRogueliteController's established StrictMode-safe pattern.
    const next = learningHistorySystem.recordAnswer(learningHistoryStateRef.current, result);
    learningHistoryStateRef.current = next;
    setLearningHistoryState(next);
  }

  function handleSelectCharacter(characterId: string) {
    setSelectedCharacterId(characterId);
    setPhase('CHARACTER_DETAIL');
  }

  function handleEquip(characterId: string, instanceId: string) {
    const result = progressionSystem.equipItem(permanentState, characterId, instanceId);
    if (result.success) {
      setPermanentState(result.permanentState);
      void saveSystem.commit({ permanent: result.permanentState });
    }
  }

  function handleUnequip(characterId: string, slot: EquipmentSlot) {
    const next = progressionSystem.unequipSlot(permanentState, characterId, slot);
    setPermanentState(next);
    void saveSystem.commit({ permanent: next });
  }

  function handleEnhance(instanceId: string) {
    const result = progressionSystem.enhanceEquipment(permanentState, instanceId);
    if (result.success) {
      setPermanentState(result.permanentState);
      void saveSystem.commit({ permanent: result.permanentState });
    }
  }

  function handleToggleLock(instanceId: string) {
    const next: PermanentState = {
      ...permanentState,
      inventory: {
        ...permanentState.inventory,
        equipment: permanentState.inventory.equipment.map((i) =>
          i.instanceId === instanceId ? { ...i, locked: !i.locked } : i,
        ),
      },
    };
    setPermanentState(next);
    void saveSystem.commit({ permanent: next });
  }

  function handleDismantle(instanceIds: string[]) {
    const result = progressionSystem.dismantleEquipment(permanentState, instanceIds);
    if (result.success) {
      setPermanentState(result.permanentState);
      void saveSystem.commit({ permanent: result.permanentState });
    }
  }

  function handleResumeRun() {
    if (!pendingRunSave) return;
    const payload = pendingRunSave.payload;
    const stage = sampleStagesById[payload.stageId];
    if (!stage) {
      // The referenced stage no longer exists in current content — the
      // safest recovery is the same as an explicit discard (never crash).
      void handleDiscardRun();
      return;
    }
    const config = buildResumedStageLaunchConfig(payload, stage, officialQuestions, sampleDepartureItemCatalogById);
    runStaticPartsRef.current = {
      areaId: payload.areaId,
      stageId: payload.stageId,
      resolvedParty: payload.resolvedParty,
      questionScope: payload.questionScope,
      itemSlotSelection: payload.itemSlotSelection,
    };
    resumeFromRef.current = {
      stageRunState: payload.stageRunState,
      liveBattleSnapshot: payload.liveBattleSnapshot,
      liveRewardSnapshot: payload.liveRewardSnapshot,
    };
    hasReconciledCurrentStageRef.current = false;
    setIsConfirmingDeparture(false);
    setLaunchConfig(config);
    setPendingRunSave(null);
    setPhase('IN_STAGE');
  }

  async function handleDiscardRun() {
    await saveSystem.commit({ clearRunTiers: ALL_RUN_TIERS });
    setPendingRunSave(null);
    setPhase('BASE_HOME');
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
    case 'BOOT_LOADING':
      return <BootLoadingScreen />;

    case 'RUN_RESUME_CHOICE': {
      const stageName = pendingRunSave ? (sampleStagesById[pendingRunSave.payload.stageId]?.name ?? pendingRunSave.payload.stageId) : '';
      return <RunResumeChoiceScreen stageName={stageName} onResume={handleResumeRun} onDiscard={() => void handleDiscardRun()} />;
    }

    case 'BASE_HOME':
      return <BaseHomeScreen leader={baseLeader} onSelect={handleBaseNavSelect} />;

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
          questionPool={officialQuestions}
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
          selected={partyEditReturnPhase === 'BASE_HOME' ? savedParty : (draft.party.length > 0 ? draft.party : savedParty)}
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
      // launchConfig is always set together with this phase (handleConfirmDeparture/handleResumeRun); this
      // fallback exists only as a defensive guard against an unreachable state, never as a
      // silent production fallback to sample data (user's explicit MVP-6 instruction).
      if (!launchConfig) return <BaseHomeScreen leader={baseLeader} onSelect={handleBaseNavSelect} />;
      return (
        <StageSessionScreen
          config={launchConfig}
          onReturnToBase={handleReturnToBase}
          onQuestionResult={handleQuestionResult}
          saveHooks={stageSaveHooks}
        />
      );
  }
}
