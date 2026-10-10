// ============================================================
// assessment.types.ts
// Type Assessment Rekrutmen
// ============================================================

export interface AssessmentComponent {
  id: string;

  name: string;

  code: string;

  weight: number;

  isActive: boolean;

  sortOrder: number;

  createdAt: string;

  updatedAt: string;
}

// ============================================================
// CREATE COMPONENT
// ============================================================

export interface CreateAssessmentComponentInput {
  name: string;

  code: string;

  weight: number;

  sortOrder?: number;
}

// ============================================================
// UPDATE COMPONENT
// ============================================================

export interface UpdateAssessmentComponentInput {
  name?: string;

  code?: string;

  weight?: number;

  sortOrder?: number;
}

// ============================================================
// ASSESSMENT SCORE
// ============================================================

export interface AssessmentScore {
  id: string;

  applyId: number;

  componentId: string;

  score: number | null;

  notes: string | null;

  sourceAttemptId: string | null;

  createdAt: string;

  updatedAt: string;
}

// ============================================================
// UPSERT SCORE
// ============================================================

export interface UpsertAssessmentScoreInput {
  applyId: number;

  componentId: string;

  score: number | null;

  notes?: string | null;

  sourceAttemptId?: string | null;
}

// ============================================================
// RESULT
// ============================================================

export interface AssessmentResultRow {
  applyId: number;

  candidateId: string | null;

  kandidatNama: string;

  email: string | null;

  noHp: string | null;

  posisi: string;

  lembaga: string;

  lokasi: string;

  componentScores: Record<
    string,
    number | null
  >;

  totalNilai: number | null;

  status:
    | "Lengkap"
    | "Perlu Penilaian";
}

// ============================================================
// SELECTION HISTORY
// ============================================================

export type SelectionHistoryType =
  | "online"
  | "manual";

export type SelectionHistoryStatus =
  | "Selesai"
  | "Perlu Penilaian"
  | "Belum Dikerjakan";

export interface SelectionHistoryItem {
  id: string;

  type: SelectionHistoryType;

  name: string;

  code: string | null;

  date: string | null;

  startedAt: string | null;

  completedAt: string | null;

  score: number | null;

  status: SelectionHistoryStatus;

  attemptId: string | null;

  componentId: string | null;
}