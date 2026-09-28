import { useMemo, useState } from 'react';
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
import { EquipmentPlaceholderScreen } from '../ui/base/EquipmentPlaceholderScreen';
import { InventoryPlaceholderScreen } from '../ui/base/InventoryPlaceholderScreen';
import { RecordPlaceholderScreen } from '../ui/base/RecordPlaceholderScreen';

const DEFAULT_RUN_SEED = 1;

/**
 * MVP-6 root controller (spec v0.6 §3/CLAUDE.md §6/§21): owns only screen
 * navigation (`AppPhase`) and the in-progress 出撃準備 draft
 * (`DepartureDraft`) — no permanent growth, Inventory, or Save data (user's
 * explicit MVP-6 instruction). `IN_STAGE` is rendered by mounting
 * `StageSessionScreen`, which is the only place `useStageController` is
 * ever called — this hook itself never calls it conditionally (Rules of
 * Hooks).
 */
export function useBaseController() {
  const [phase, setPhase] = useState<AppPhase>('BASE_HOME');
  const [draft, setDraft] = useState(createEmptyDepartureDraft());
  const [launchConfig, setLaunchConfig] = useState<StageLaunchConfig | null>(null);
  const [nextRunSeed, setNextRunSeed] = useState(DEFAULT_RUN_SEED);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [partyEditReturnPhase, setPartyEditReturnPhase] = useState<AppPhase>('BASE_HOME');
  const [isConfirmingDeparture, setIsConfirmingDeparture] = useState(false);

  const questionCatalog = useMemo(() => deriveQuestionCatalog(sampleQuestions), []);

  const selectedArea = draft.areaId ? (sampleAreas.find((a) => a.id === draft.areaId) ?? null) : null;
  const areaStages = selectedArea ? resolveAreaStages(selectedArea, sampleStagesById) : [];
  const selectedStage = draft.stageId ? (sampleStagesById[draft.stageId] ?? null) : null;

  const departureValidation = validateDeparture(draft, sampleQuestions);

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
    const config = buildStageLaunchConfig(draft, selectedStage, sampleQuestions, sampleDepartureItemCatalogById, nextRunSeed);
    setNextRunSeed((seed) => seed + 1);
    setLaunchConfig(config);
    setPhase('IN_STAGE');
  }

  function handleReturnToBase() {
    setLaunchConfig(null);
    setIsConfirmingDeparture(false);
    setDraft(createEmptyDepartureDraft());
    setPhase('BASE_HOME');
  }

  function handleSelectCharacter(characterId: string) {
    setSelectedCharacterId(characterId);
    setPhase('CHARACTER_DETAIL');
  }

  function renderDeparturePrep() {
    return (
      <DeparturePrepScreen
        draft={draft}
        questionCatalog={questionCatalog}
        itemCatalog={sampleDepartureItemCatalog}
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
          roster={sampleParty}
          selected={draft.party}
          onSave={handleSaveParty}
          onCancel={handleCancelPartyEdit}
        />
      );

    case 'CHARACTER_LIST':
      return <CharacterListView roster={sampleParty} onSelect={handleSelectCharacter} onBack={goHome} />;

    case 'CHARACTER_DETAIL': {
      const character = sampleParty.find((c) => c.id === selectedCharacterId);
      if (!character) return <CharacterListView roster={sampleParty} onSelect={handleSelectCharacter} onBack={goHome} />;
      return <CharacterDetailView character={character} onBack={() => setPhase('CHARACTER_LIST')} />;
    }

    case 'EQUIPMENT_LIST':
      return <EquipmentPlaceholderScreen onBack={goHome} />;

    case 'INVENTORY_LIST':
      return <InventoryPlaceholderScreen onBack={goHome} />;

    case 'RECORD_LIST':
      return <RecordPlaceholderScreen onBack={goHome} />;

    case 'IN_STAGE':
      // launchConfig is always set together with this phase (handleConfirmDeparture); this
      // fallback exists only as a defensive guard against an unreachable state, never as a
      // silent production fallback to sample data (user's explicit MVP-6 instruction).
      if (!launchConfig) return <BaseHomeScreen onSelect={handleHotspotSelect} />;
      return <StageSessionScreen config={launchConfig} onReturnToBase={handleReturnToBase} />;
  }
}
