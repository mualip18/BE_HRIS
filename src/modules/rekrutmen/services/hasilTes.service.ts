import {
  hasilTesRepository,
} from "../repositories/hasilTes.repository";

// ============================================================
// TYPES
// ============================================================

export type CandidateResultDecisionType =
  | "not_passed"
  | "without_note"
  | "with_note";

export interface HasilTes {
  id: string;
  attemptId: string;

  applyId: number | null;

  candidateId: string;
  testId: string;

  kandidatNama: string;
  email: string | null;

  posisi: string;
  lembaga: string;
  lokasi: string;

  materiNama: string;

  tanggalTes: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;

  questionType?: string | null;

  multipleChoiceScore: number | null;
  essayScore: number | null;
  audioScore: number | null;

  totalNilai: number | null;

  finalTotalNilai?: number | null;
  finalPassingScore?: number | null;
  finalStatus?: string;
  finalTotalTests?: number;
  finalCompletedTests?: number;
  finalScoredTests?: number;

  automaticStatus?: string;
  scoreStatus?: string;

  decision?:
    | CandidateResultDecisionType
    | null;

  catatan?: string | null;

  attemptStatus: string | null;

  status: string;

  passed: boolean | null;
}

export interface JawabanTes {
  id: string;
  soalId: string;

  pertanyaan: string;
  tipe: string;

  jawabanUser: string | null;

  answerText?: string | null;
  answerImage?: string | null;
  answerAudio?: string | null;

  selectedOptionId?: string | null;
  selectedOptionText?: string | null;

  nilai: number | null;
  nilaiBaru: number | null;

  status:
    | "reviewed"
    | "pending"
    | "auto";

  scoreStatus?:
    | "reviewed"
    | "pending"
    | "auto";
}

export interface HasilTesDetail
  extends HasilTes {
  noHp: string;

  passingScore?: number | null;

  jawabanList: JawabanTes[];
}

export interface HasilTesPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HasilTesListResponse {
  success: boolean;
  message: string;
  data: HasilTes[];
  pagination: HasilTesPagination;
}

export interface HasilTesDetailResponse {
  success: boolean;
  message: string;
  data: HasilTesDetail;
}

export interface HasilTesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  testId?: string;
}

export interface PassingScoreSettings {
  passingScore: number;
  updatedAt?: string | null;
}

export interface PassingScoreResponse {
  success: boolean;
  message: string;
  data: PassingScoreSettings;
}

export interface UpdateCandidateDecisionPayload {
  decision: CandidateResultDecisionType;
  catatan?: string | null;
}

export interface CandidateResultDecision {
  applyId: number;
  decision: CandidateResultDecisionType;
  catatan: string | null;
  status: string;
  automaticStatus: string;
  scoreStatus: string;
  totalScore: number | null;
  passingScore: number;
  passed: boolean | null;
  updatedAt?: string | null;
}

export interface CandidateResultDecisionResponse {
  success: boolean;
  message: string;
  data: CandidateResultDecision;
}

// ============================================================
// SERVICE
// ============================================================

export const hasilTesService = {
  // ==========================================================
  // GET PAGINATED
  // ==========================================================

  async getPaginated(
    params: HasilTesParams = {}
  ): Promise<HasilTesListResponse> {
    const result =
      await hasilTesRepository.findAll({
        page:
          Number(
            params.page
          ) || 1,

        limit:
          Number(
            params.limit
          ) || 10,

        search:
          params.search,

        status:
          params.status,

        testId:
          params.testId,
      });

    const page =
      Number(
        params.page
      ) || 1;

    const limit =
      Number(
        params.limit
      ) || 10;

    const total =
      Number(
        result.total || 0
      );

    return {
      success: true,

      message:
        "Data hasil tes berhasil diambil",

      data:
        result.data,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    };
  },

  // ==========================================================
  // GET DETAIL
  // ==========================================================

  async getById(
    attemptId: string
  ): Promise<HasilTesDetailResponse> {
    if (!attemptId) {
      throw new Error(
        "Attempt ID tidak ditemukan"
      );
    }

    const result =
      await hasilTesRepository.findById(
        attemptId
      );

    if (!result) {
      throw new Error(
        "Hasil tes tidak ditemukan"
      );
    }

    return {
      success: true,

      message:
        "Detail hasil tes berhasil diambil",

      data:
        result as HasilTesDetail,
    };
  },

  // ==========================================================
  // GET GLOBAL PASSING SCORE
  // ==========================================================

  async getPassingScore(): Promise<PassingScoreResponse> {
    const passingScore =
      await hasilTesRepository.getPassingScore();

    return {
      success: true,

      message:
        "Passing score berhasil diambil",

      data: {
        passingScore:
          Number(
            passingScore
          ),
      },
    };
  },

  // ==========================================================
  // UPDATE GLOBAL PASSING SCORE
  // ==========================================================

  async updatePassingScore(
    passingScore: number
  ): Promise<PassingScoreResponse> {
    const numericScore =
      Number(passingScore);

    if (
      !Number.isFinite(
        numericScore
      )
    ) {
      throw new Error(
        "Nilai lolos harus berupa angka"
      );
    }

    if (
      numericScore < 0 ||
      numericScore > 100
    ) {
      throw new Error(
        "Nilai lolos harus antara 0 sampai 100"
      );
    }

    const result =
      await hasilTesRepository.updatePassingScore(
        Number(
          numericScore.toFixed(2)
        )
      );

    return {
      success: true,

      message:
        "Nilai lolos berhasil diperbarui",

      data: {
        passingScore:
          Number(
            result?.passing_score ??
              numericScore
          ),

        updatedAt:
          result?.updated_at ??
          null,
      },
    };
  },

  // ==========================================================
  // UPDATE NILAI SOAL
  // ==========================================================

  async updateNilai(
    attemptId: string,
    questionId: string,
    score: number
  ) {
    if (!attemptId) {
      throw new Error(
        "Attempt ID tidak ditemukan"
      );
    }

    if (!questionId) {
      throw new Error(
        "Question ID tidak ditemukan"
      );
    }

    const numericScore =
      Number(score);

    if (
      !Number.isFinite(
        numericScore
      )
    ) {
      throw new Error(
        "Nilai harus berupa angka"
      );
    }

    if (
      numericScore < 0 ||
      numericScore > 100
    ) {
      throw new Error(
        "Nilai harus antara 0 sampai 100"
      );
    }

    return hasilTesRepository.updateQuestionScore(
      attemptId,
      questionId,
      numericScore
    );
  },

  // ==========================================================
  // UPDATE KEPUTUSAN KELULUSAN
  // ==========================================================
  //
  // not_passed:
  //   Status akhir mengikuti hasil otomatis.
  //
  // without_note:
  //   Status akhir = Lolos.
  //
  // with_note:
  //   Status akhir = Lolos.
  //
  // automaticStatus tetap berdasarkan nilai.
  //
  // ==========================================================

  async updateCandidateDecision(
    applyId: number,
    payload: UpdateCandidateDecisionPayload
  ): Promise<CandidateResultDecisionResponse> {
    const numericApplyId =
      Number(applyId);

    if (
      !Number.isInteger(
        numericApplyId
      ) ||
      numericApplyId <= 0
    ) {
      throw new Error(
        "Apply ID kandidat tidak valid"
      );
    }

    const decision =
      payload?.decision;

    const catatan =
      typeof payload?.catatan ===
      "string"
        ? payload.catatan.trim()
        : "";

    // ----------------------------------------------------------
    // VALIDASI DECISION
    // ----------------------------------------------------------

    if (
      decision !==
        "not_passed" &&
      decision !==
        "without_note" &&
      decision !==
        "with_note"
    ) {
      throw new Error(
        "Keputusan kandidat tidak valid"
      );
    }

    // ----------------------------------------------------------
    // WITH NOTE WAJIB CATATAN
    // ----------------------------------------------------------

    if (
      decision ===
        "with_note" &&
      !catatan
    ) {
      throw new Error(
        "Catatan wajib diisi untuk keputusan Lolos dengan Catatan"
      );
    }

    // ----------------------------------------------------------
    // BATAS CATATAN
    // ----------------------------------------------------------

    if (
      catatan.length >
      2000
    ) {
      throw new Error(
        "Catatan maksimal 2000 karakter"
      );
    }

    // ----------------------------------------------------------
    // CATATAN FINAL
    // ----------------------------------------------------------

    const finalCatatan =
      decision ===
      "with_note"
        ? catatan
        : null;

    // ----------------------------------------------------------
    // UPDATE DATABASE
    // ----------------------------------------------------------

    const result =
      await hasilTesRepository.updateCandidateDecision(
        numericApplyId,
        decision,
        finalCatatan
      );

    // ----------------------------------------------------------
    // STATUS OTOMATIS
    // ----------------------------------------------------------
    //
    // Status ini murni berdasarkan nilai.
    // Dipakai FE untuk warna badge.
    //
    // ----------------------------------------------------------

    const automaticStatus =
      result?.automatic_status ??
      result?.score_status ??
      "Perlu Review";

    const totalScore =
      result?.total_score ===
        null ||
      result?.total_score ===
        undefined
        ? null
        : Number(
            result.total_score
          );

    const passingScore =
      Number(
        result?.passing_score ??
          70
      );

    // ----------------------------------------------------------
    // STATUS FINAL
    // ----------------------------------------------------------

    let finalStatus =
      automaticStatus;

    if (
      decision ===
      "without_note"
    ) {
      finalStatus =
        "Lolos";
    }

    if (
      decision ===
      "with_note"
    ) {
      finalStatus =
        "Lolos";
    }

    if (
      decision ===
      "not_passed"
    ) {
      finalStatus =
        automaticStatus;
    }

    // ----------------------------------------------------------
    // PASSED
    // ----------------------------------------------------------

    const passed =
      finalStatus ===
      "Lolos"
        ? true
        : finalStatus ===
            "Tidak Lolos"
          ? false
          : null;

    return {
      success: true,

      message:
        "Keputusan kandidat berhasil diperbarui",

      data: {
        applyId:
          Number(
            result.apply_id
          ),

        decision:
          result.decision as CandidateResultDecisionType,

        catatan:
          result.catatan ??
          null,

        status:
          finalStatus,

        automaticStatus:
          automaticStatus,

        scoreStatus:
          automaticStatus,

        totalScore:
          totalScore,

        passingScore:
          passingScore,

        passed:
          passed,

        updatedAt:
          result.updated_at ??
          null,
      },
    };
  },

  // ==========================================================
  // DELETE
  // ==========================================================

  async delete(
    attemptId: string
  ) {
    if (!attemptId) {
      throw new Error(
        "Attempt ID tidak ditemukan"
      );
    }

    return hasilTesRepository.delete(
      attemptId
    );
  },
};

export default hasilTesService;