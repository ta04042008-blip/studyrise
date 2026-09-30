import type { QuestionCommandOutcome } from '../battle/BattleEngine.types';
import type { MultipleChoiceAnswer } from '../question/QuestionEngine.types';
import type { QuestionResult } from './LearningHistory.types';

/**
 * Converts a just-accepted BattleEngine `QuestionCommandOutcome` into
 * LearningHistorySystem's boundary DTO (user's explicit MVP-8 instruction:
 * "QuestionResult → LearningHistorySystem"). BattleEngine/QuestionEngine
 * stay completely unaware of this — this is a pure, one-directional mapping
 * called only from the answer-confirmation event handler.
 *
 * `answer.type` (what was actually submitted) is the explicit source for
 * CORRECT/INCORRECT/UNKNOWN, per user's instruction — never inferred from
 * `outcome.selectedAnswerIndex === null` alone.
 */
export function questionResultFromAnswer(answer: MultipleChoiceAnswer, outcome: QuestionCommandOutcome): QuestionResult {
  const { question } = outcome;
  const base = {
    questionId: question.id,
    subject: question.subject,
    field: question.field,
    unit: question.unit,
    star: question.star,
  };

  if (answer.type === 'dont_know') {
    return { ...base, answerResult: 'UNKNOWN', recordedAnswer: { type: 'UNKNOWN' } };
  }

  const recordedAnswer =
    answer.type === 'multiple_choice' ? { type: 'MULTIPLE_CHOICE' as const, selectedIndex: answer.selectedIndex } :
    answer.type === 'true_false' ? { type: 'TRUE_FALSE' as const, value: answer.value } :
    answer.type === 'ordering' ? { type: 'ORDERING' as const, order: answer.order } :
    { type: 'SHORT_ANSWER' as const, value: answer.value };

  return { ...base, answerResult: outcome.correct ? 'CORRECT' : 'INCORRECT', recordedAnswer };
}
