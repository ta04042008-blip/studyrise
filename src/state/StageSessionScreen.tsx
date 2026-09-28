import { useStageController } from './useStageController';
import type { StageLaunchConfig } from '../base/base.types';
import type { StageEndContext } from '../engine/progression/ProgressionSystem.types';
import type { QuestionResult } from '../engine/learningHistory/LearningHistory.types';

interface StageSessionScreenProps {
  config: StageLaunchConfig;
  onReturnToBase: (endContext: StageEndContext) => void;
  /** Learning-history event boundary (spec v0.8 §13, user's explicit MVP-8 instruction) — threaded straight through to `useStageController`. */
  onQuestionResult?: (result: QuestionResult) => void;
}

/**
 * The ONLY place `useStageController` is called (Rules of Hooks — user's
 * explicit MVP-6 requirement). The base layer mounts/unmounts this
 * component when entering/leaving `IN_STAGE`; it never calls the hook
 * itself conditionally. Because this component's own body always calls the
 * hook exactly once per render, React's rule ("same hooks, same order,
 * every render") holds even though the *screen it represents* is only
 * shown some of the time — conditionally mounting a component is fine,
 * conditionally calling a hook inside one is not.
 */
export function StageSessionScreen({ config, onReturnToBase, onQuestionResult }: StageSessionScreenProps) {
  return useStageController(config, onReturnToBase, onQuestionResult);
}
