export type HasilTesStatus =
  | "Lolos"
  | "Tidak Lolos"
  | "Perlu Review"
  | "Dalam Proses";


export interface HasilTesListItem {

  id: string;

  attemptId: string;

  candidateId: string;

  applyId: number | null;

  kandidatNama: string;

  email: string | null;

  noHp: string | null;

  posisi: string;

  lembaga: string;

  lokasi: string;

  testId: string;

  testNama: string;

  materiNama?: string | null;

  tanggalTes: string | null;

  startedAt: string | null;

  finishedAt: string | null;

  attemptStatus: string;

  statusAttempt?: string;

  multipleChoiceScore: number;

  essayScore: number;

  audioScore: number;

  totalNilai: number | null;

  passingScore?: number | null;

  passed: boolean | null;

  status: HasilTesStatus;
}


export interface JawabanTes {

  id: string;

  attemptId: string;

  soalId: string;

  pertanyaan: string;

  tipe: string;

  jawabanUser: string | null;

  answerImage?: string | null;

  answerAudio?: string | null;

  nilai: number | null;

  nilaiBaru: number | null;

  status: string;

  scoreStatus?: string | null;
}


export interface HasilTesDetail
  extends HasilTesListItem {

  jawabanList: JawabanTes[];

}


export interface HasilTesFilter {

  search?: string;

  status?: string;

  testId?: string;

  page: number;

  limit: number;

}


export interface UpdateNilaiRequest {

  nilai: number;

}