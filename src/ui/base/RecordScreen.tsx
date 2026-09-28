import { useState } from 'react';
import type { LearningHistoryRecord } from '../../engine/learningHistory/LearningHistory.types';
import type { QuestionDefinition } from '../../engine/question/QuestionEngine.types';
import { RecordOverallSummaryView } from './RecordOverallSummaryView';
import { RecordSubjectBreakdownView } from './RecordSubjectBreakdownView';
import { RecordStarBreakdownView } from './RecordStarBreakdownView';
import { RecordHistoryListView } from './RecordHistoryListView';
import { RecordHistoryDetailView } from './RecordHistoryDetailView';

interface RecordScreenProps {
  records: LearningHistoryRecord[];
  /** Canonical QuestionDefinition registry (user's explicit MVP-8 instruction: resolve against the FULL catalog, not a Stage-scoped subset). */
  questionsById: Record<string, QuestionDefinition>;
  onBack: () => void;
}

type RecordSection = 'SUMMARY' | 'HISTORY';

/**
 * 記録 (spec v0.8 §3.8/§13): 拠点ホームの「記録」導線を実体化する画面
 * (MVP-6のプレースホルダーを置換)。全体サマリー／教科→分野→単元／★別／
 * 履歴一覧＋絞り込み／履歴詳細をまとめて構成する。集計値は保存せず、常に
 * `records`（LearningHistoryState.records）から導出する（CLAUDE.md §9 —
 * このコンポーネント自身は何も計算しない）。
 */
export function RecordScreen({ records, questionsById, onBack }: RecordScreenProps) {
  const [section, setSection] = useState<RecordSection>('SUMMARY');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const selectedRecord = selectedRecordId ? (records.find((r) => r.id === selectedRecordId) ?? null) : null;

  function selectSection(next: RecordSection) {
    setSection(next);
    setSelectedRecordId(null);
  }

  return (
    <div className="record-screen">
      <h1>記録</h1>

      <nav className="record-screen__tabs">
        <button type="button" aria-pressed={section === 'SUMMARY'} onClick={() => selectSection('SUMMARY')}>
          サマリー
        </button>
        <button type="button" aria-pressed={section === 'HISTORY'} onClick={() => selectSection('HISTORY')}>
          履歴一覧
        </button>
      </nav>

      {section === 'SUMMARY' && (
        <>
          <RecordOverallSummaryView records={records} />
          <RecordSubjectBreakdownView records={records} />
          <RecordStarBreakdownView records={records} />
        </>
      )}

      {section === 'HISTORY' &&
        (selectedRecord ? (
          <RecordHistoryDetailView
            record={selectedRecord}
            question={questionsById[selectedRecord.questionId]}
            onBack={() => setSelectedRecordId(null)}
          />
        ) : (
          <RecordHistoryListView records={records} questionsById={questionsById} onSelectRecord={setSelectedRecordId} />
        ))}

      <button type="button" onClick={onBack}>
        拠点へ戻る
      </button>
    </div>
  );
}
