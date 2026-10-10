import { CandidateRepository } from "../repositories/candidate.repository";
import InterviewRepository from "../repositories/interview.repository";

import {
  Candidate,
  CandidateDetail,
  UpdateStatusRequest,
  InviteRequest,
  InterviewInvitation,
} from "../types/candidate.types";

import { sendInterviewInvitation } from "../../../core/utils/email";

export class CandidateService {
  private candidateRepository = new CandidateRepository();

  // InterviewRepository sekarang adalah default export object,
  // bukan class.
  private interviewRepository = InterviewRepository;

  // ============================================================
  // GET CANDIDATES
  // ============================================================

  async getCandidates(
    search: string,
    status: string,
    page: number,
    limit: number
  ) {
    const { data, total } =
      await this.candidateRepository.findAll(
        search,
        status,
        page,
        limit
      );

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // ============================================================
  // GET CANDIDATE DETAIL
  // ============================================================

  async getCandidateDetail(
    id: number
  ): Promise<CandidateDetail | null> {
    return this.candidateRepository.findById(id);
  }

  // ============================================================
  // UPDATE STATUS
  // ============================================================

  async updateStatus(
    id: number,
    status: UpdateStatusRequest["status"]
  ): Promise<void> {
    const validStatuses = [
      "pending",
      "review",
      "interview",
      "accepted",
      "rejected",
    ];

    if (!validStatuses.includes(status)) {
      throw new Error("Status tidak valid");
    }

    await this.candidateRepository.updateStatus(id, status);
  }

  // ============================================================
  // INVITE CANDIDATE
  // ============================================================

  async inviteCandidate(
    applyId: number,
    data: InviteRequest
  ): Promise<any> {
    /**
     * Catatan:
     *
     * Repository interview sekarang bekerja dengan tabel:
     *
     * interviews
     *
     * Bukan lagi:
     *
     * interview_invitations
     *
     * Karena itu payload lama:
     *
     * create(applyId, data)
     *
     * tidak bisa digunakan lagi.
     */

    // ----------------------------------------------------------
    // Ambil interview yang sudah ada
    // ----------------------------------------------------------

    const existingInterview =
      await this.interviewRepository.findByApplyId(applyId);

    if (existingInterview) {
      return existingInterview;
    }

    // ----------------------------------------------------------
    // Template interview
    // ----------------------------------------------------------
    //
    // Untuk sementara ambil template behavioral.
    //
    // Nanti bisa kita ubah supaya template_id dikirim
    // langsung dari frontend.
    //

    const templateResult =
      await this.getDefaultInterviewTemplate();

    if (!templateResult) {
      throw new Error(
        "Template interview belum tersedia. Silakan buat data interview_templates terlebih dahulu."
      );
    }

    // ----------------------------------------------------------
    // Normalisasi tanggal
    // ----------------------------------------------------------

    const tanggal =
      (data as any).tanggal ??
      (data as any).date ??
      null;

    const jam =
      (data as any).jam ??
      (data as any).time ??
      null;

    // ----------------------------------------------------------
    // Buat interview
    // ----------------------------------------------------------

    const interview =
      await this.interviewRepository.create({
        applyId,

        templateId: templateResult.id,

        tanggal,
        jam,

        interviewerId:
          (data as any).interviewerId ??
          null,

        location:
          (data as any).lokasi ??
          (data as any).location ??
          null,

        status: "scheduled",

        decision: null,

        totalScore: null,

        notes:
          (data as any).catatan ??
          (data as any).notes ??
          null,
      });

    // ----------------------------------------------------------
    // Update status kandidat
    // ----------------------------------------------------------

    await this.candidateRepository.updateStatus(
      applyId,
      "interview"
    );

    // ----------------------------------------------------------
    // Kirim email undangan
    // ----------------------------------------------------------

    const candidate =
      await this.candidateRepository.findById(applyId);

    if (candidate) {
      sendInterviewInvitation(
        candidate,
        data
      ).catch((err) =>
        console.error(
          "Gagal kirim email undangan:",
          err
        )
      );
    }

    return interview;
  }

  // ============================================================
  // DEFAULT INTERVIEW TEMPLATE
  // ============================================================

  private async getDefaultInterviewTemplate(): Promise<{
    id: string;
    name: string;
    type: string;
  } | null> {
    /**
     * Kita tidak menggunakan repository khusus template
     * supaya perubahan tetap minimal.
     */

    const dbModule =
      await import("../../../config/db");

    const db = dbModule.default;

    const result = await db.query(`
      SELECT
        id,
        name,
        type
      FROM interview_templates
      WHERE status = 'active'
      ORDER BY
        CASE
          WHEN type = 'behavioral' THEN 1
          WHEN type = 'administrative' THEN 2
          WHEN type = 'technical' THEN 3
          ELSE 4
        END,
        created_at ASC
      LIMIT 1
    `);

    return result.rows[0] || null;
  }
}