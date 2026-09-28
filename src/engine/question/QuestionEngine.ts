import type { StarLevel } from '../../types/stats';
import type { RandomService } from '../random/RandomService';
import type { QuestionDefinition } from './QuestionEngine.types';
import { validateQuestionPool } from './questionValidation';

/**
 * MVP-9: QuestionEngine's one piece of mutable, pick-affecting state
 * (user's explicit audit instruction §1). `lastPicked` is not cosmetic —
 * it changes the CANDIDATE POOL SIZE `pickQuestion` hands to
 * `random.pick()` (see the dispersion filter below), and `random.pick`
 * selects by `floor(next() * items.length)`, so a different pool length
 * with the exact same RNG draw can select a different question entirely.
 * A restored QuestionEngine that starts with `lastPicked: null` (instead of
 * whatever it actually was at snapshot time) can therefore diverge from a
 * non-reloaded session's next pick even though the RNG cursor itself
 * continues identically — this is why it must be captured and restored
 * explicitly, never left to a fresh engine's default.
 */
export interface QuestionEngineSnapshot {
  lastPicked: { id: string; unit: string; format: string } | null;
}

export interface QuestionEngine {
  /** Subjects with at least one valid question (spec §12.3: 教科 is selectable per problem command). */
  listSubjects(): string[];
  /** ★ levels with at least one valid question for the given subject (spec §12.3: ★ selectable while candidates exist). */
  listStars(subject: string): StarLevel[];
  /** Picks one question for subject+star, with light dispersion (spec §12.4). Throws if no candidates exist. */
  pickQuestion(subject: string, star: StarLevel): QuestionDefinition;
  /** Questions that failed validation at load time (for dev-time reporting; CLAUDE.md §14/§19). */
  getInvalidCount(): number;
  /** MVP-9: exports the dispersion-affecting state — see QuestionEngineSnapshot. */
  exportSnapshot(): QuestionEngineSnapshot;
}

/**
 * `initialSnapshot` (MVP-9, optional) resumes `lastPicked` from a previously
 * exported QuestionEngineSnapshot instead of starting fresh — omitting it is
 * byte-identical to every existing call site's behavior (lastPicked starts
 * `null`), so this is purely additive.
 */
export function createQuestionEngine(
  rawPool: readonly QuestionDefinition[],
  random: RandomService,
  initialSnapshot?: QuestionEngineSnapshot,
): QuestionEngine {
  const { validQuestions, invalid } = validateQuestionPool(rawPool);

  if (invalid.length > 0 && typeof console !== 'undefined') {
    for (const { question, errors } of invalid) {
      console.warn(`[QuestionEngine] excluding invalid question "${question.id}": ${errors.join(', ')}`);
    }
  }

  let lastPicked: { id: string; unit: string; format: string } | null = initialSnapshot?.lastPicked ?? null;

  function candidatesFor(subject: string, star: StarLevel): QuestionDefinition[] {
    return validQuestions.filter((q) => q.subject === subject && q.star === star);
  }

  return {
    listSubjects() {
      return Array.from(new Set(validQuestions.map((q) => q.subject)));
    },

    listStars(subject: string) {
      const stars = new Set<StarLevel>();
      for (const q of validQuestions) {
        if (q.subject === subject) {
          stars.add(q.star);
        }
      }
      return Array.from(stars).sort((a, b) => a - b);
    },

    pickQuestion(subject: string, star: StarLevel) {
      const candidates = candidatesFor(subject, star);
      if (candidates.length === 0) {
        throw new Error(`No candidate questions for subject="${subject}" star=${star}`);
      }

      // Light dispersion (spec §12.4): avoid repeating the same question,
      // unit, or format as the immediately previous pick, when the pool is
      // wide enough to allow it. A narrow pool is allowed to repeat.
      const dispersed = candidates.filter(
        (q) => !lastPicked || (q.id !== lastPicked.id && q.unit !== lastPicked.unit && q.format !== lastPicked.format),
      );
      const pool = dispersed.length > 0 ? dispersed : candidates;

      const picked = random.pick(pool);
      lastPicked = { id: picked.id, unit: picked.unit, format: picked.format };
      return picked;
    },

    getInvalidCount() {
      return invalid.length;
    },

    exportSnapshot() {
      return { lastPicked };
    },
  };
}
