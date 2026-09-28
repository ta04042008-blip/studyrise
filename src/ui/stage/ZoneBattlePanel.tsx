import { BattleScreen } from '../battle/BattleScreen';
import { useBattleController } from '../../state/useBattleController';
import type { RunResolver } from '../../engine/stage/StageEngine';
import type {
  CharacterDefinition,
  EnemyBattleInstance,
  ItemBattleSlot,
  SpellDefinition,
} from '../../engine/battle/BattleEngine.types';
import type { RunState } from '../../engine/roguelite/RogueliteEngine.types';
import type { QuestionDefinition } from '../../engine/question/QuestionEngine.types';
import type { QuestionResult } from '../../engine/learningHistory/LearningHistory.types';

interface ZoneBattlePanelProps {
  party: CharacterDefinition[];
  enemies: EnemyBattleInstance[];
  runState: RunState;
  runResolver: RunResolver;
  questions: readonly QuestionDefinition[];
  spellsById: Record<string, SpellDefinition>;
  initialItems: ItemBattleSlot[];
  seed: number;
  onWin: (survivorHpByCharacterId: Record<string, number>, remainingBattleItems: ItemBattleSlot[]) => void;
  onLose: (remainingBattleItems: ItemBattleSlot[]) => void;
  /** Learning-history event boundary (spec v0.8 §13, user's explicit MVP-8 instruction) — threaded straight through to `useBattleController`. */
  onQuestionResult?: (result: QuestionResult) => void;
}

/**
 * One Zone's battle (CLAUDE.md §9: presentation + dispatch only). Meant to
 * be mounted with `key={zoneId}` by its caller so a fresh BattleEngine is
 * guaranteed each Zone — `useBattleController` itself already resyncs on a
 * `seed` change, but keying the whole panel keeps this component trivially
 * correct without relying on that detail.
 */
export function ZoneBattlePanel({
  party,
  enemies,
  runState,
  runResolver,
  questions,
  spellsById,
  initialItems,
  seed,
  onWin,
  onLose,
  onQuestionResult,
}: ZoneBattlePanelProps) {
  // Pure, randomness-free (MVP-5 correction 4: same single source StageEngine's KO-revival math uses) — safe to call every render.
  const battleInputs = runResolver.resolveBattleInputsForRun(party, runState);

  const battleController = useBattleController({
    players: battleInputs.players,
    enemies,
    questions,
    spellsById,
    initialItems,
    knownSpellsByPlayerId: battleInputs.knownSpellsByPlayerId,
    playerCommandModifiers: battleInputs.playerCommandModifiers,
    initialHpByPlayerId: battleInputs.initialHpByPlayerId,
    seed,
    onQuestionResult,
  });

  const { state } = battleController;

  return (
    <>
      <BattleScreen controller={battleController} />
      {state.phase === 'BATTLE_END' && state.outcome === 'win' && (
        <button
          type="button"
          onClick={() => onWin(Object.fromEntries(state.players.map((p) => [p.id, p.currentHp])), state.battleItems)}
        >
          ゾーンクリア → 報酬へ
        </button>
      )}
      {state.phase === 'BATTLE_END' && state.outcome === 'lose' && (
        <button type="button" onClick={() => onLose(state.battleItems)}>
          敗北 — ステージ失敗
        </button>
      )}
    </>
  );
}
