import type { QuestionDefinition } from '../../engine/question/QuestionEngine.types';
import { officialQuestionsMathIA } from './officialQuestionsMathIA';
import { officialQuestionsMathIIB } from './officialQuestionsMathIIB';
import { officialQuestionsMathIIIC } from './officialQuestionsMathIIIC';
import { officialQuestionsEnglish } from './officialQuestionsEnglish';

export const officialQuestions: QuestionDefinition[] = [
  ...officialQuestionsMathIA,
  ...officialQuestionsMathIIB,
  ...officialQuestionsMathIIIC,
  ...officialQuestionsEnglish,
];
