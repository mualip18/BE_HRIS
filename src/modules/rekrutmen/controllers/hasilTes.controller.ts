import {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  hasilTesService,
} from "../services/hasilTes.service";

export class HasilTesController {
  // ============================================================
  // GET LIST HASIL TES
  // GET /api/rekrutmen/hasil-tes
  // ============================================================

  async getAll(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const page =
        Math.max(
          1,
          Number(
            req.query.page
          ) || 1
        );

      const limit =
        Math.min(
          100,
          Math.max(
            1,
            Number(
              req.query.limit
            ) || 10
          )
        );

      const search =
        String(
          req.query.search ||
            ""
        );

      const status =
        String(
          req.query.status ||
            "semua"
        );

      const testId =
        req.query.testId
          ? String(
              req.query.testId
            )
          : undefined;

      console.log(
        "=== GET HASIL TES ==="
      );

      console.log({
        page,
        limit,
        search,
        status,
        testId,
      });

      const result =
        await hasilTesService.getPaginated({
          page,
          limit,
          search,
          status,
          testId,
        });

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Data hasil tes berhasil diambil",
          data:
            result.data,
          pagination:
            result.pagination,
        });
    } catch (error) {
      console.error(
        "GET HASIL TES ERROR:",
        error
      );

      next(error);
    }
  }

  // ============================================================
  // GET SETTINGS NILAI LOLOS
  // GET /api/rekrutmen/hasil-tes/settings
  // ============================================================

  async getSettings(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result =
        await hasilTesService.getPassingScore();

      return res
        .status(200)
        .json({
          success:
            result.success,
          message:
            result.message,
          data: {
            passingScore:
              Number(
                result.data
                  .passingScore
              ),
            updatedAt:
              result.data
                .updatedAt ??
              null,
          },
        });
    } catch (error) {
      console.error(
        "GET HASIL TES SETTINGS ERROR:",
        error
      );

      next(error);
    }
  }

  // ============================================================
  // UPDATE NILAI LOLOS
  // PUT /api/rekrutmen/hasil-tes/settings/passing-score
  // ============================================================

  async updatePassingScore(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const passingScore =
        Number(
          req.body?.passingScore
        );

      if (
        !Number.isFinite(
          passingScore
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "passingScore harus berupa angka",
          });
      }

      if (
        passingScore < 0 ||
        passingScore > 100
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Nilai lolos harus antara 0 sampai 100",
          });
      }

      const result =
        await hasilTesService.updatePassingScore(
          passingScore
        );

      return res
        .status(200)
        .json({
          success:
            result.success,
          message:
            result.message,
          data: {
            passingScore:
              Number(
                result.data
                  .passingScore
              ),
            updatedAt:
              result.data
                .updatedAt ??
              null,
          },
        });
    } catch (error) {
      console.error(
        "UPDATE PASSING SCORE ERROR:",
        error
      );

      next(error);
    }
  }

  // ============================================================
  // UPDATE KEPUTUSAN KANDIDAT
  //
  // PUT
  // /api/rekrutmen/hasil-tes/applications/:applyId/decision
  //
  // Decision:
  //
  // not_passed
  //   = Tidak Lolos
  //
  // without_note
  //   = Lolos
  //
  // with_note
  //   = Lolos dengan Catatan
  //
  // ============================================================

  async updateCandidateDecision(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      // --------------------------------------------------------
      // APPLY ID
      // --------------------------------------------------------

      const applyId =
        Number(
          req.params.applyId
        );

      if (
        !Number.isInteger(
          applyId
        ) ||
        applyId <= 0
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Apply ID tidak valid",
          });
      }

      // --------------------------------------------------------
      // DECISION
      // --------------------------------------------------------

      const decision =
        String(
          req.body?.decision ||
            ""
        ).trim();

      if (
        decision !==
          "not_passed" &&
        decision !==
          "without_note" &&
        decision !==
          "with_note"
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Decision harus not_passed, without_note, atau with_note",
          });
      }

      // --------------------------------------------------------
      // CATATAN
      // --------------------------------------------------------

      let catatan:
        | string
        | null =
        req.body?.catatan ===
          null ||
        req.body?.catatan ===
          undefined
          ? null
          : String(
              req.body.catatan
            );

      if (
        typeof catatan ===
        "string"
      ) {
        catatan =
          catatan.trim();
      }

      // --------------------------------------------------------
      // WITH NOTE WAJIB ADA CATATAN
      // --------------------------------------------------------

      if (
        decision ===
          "with_note" &&
        !catatan
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Catatan wajib diisi untuk Lolos dengan Catatan",
          });
      }

      // --------------------------------------------------------
      // DECISION SELAIN WITH NOTE
      // TIDAK MEMAKAI CATATAN
      // --------------------------------------------------------

      if (
        decision !==
        "with_note"
      ) {
        catatan = null;
      }

      // --------------------------------------------------------
      // BATAS CATATAN
      // --------------------------------------------------------

      if (
        catatan &&
        catatan.length >
          2000
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Catatan maksimal 2000 karakter",
          });
      }

      console.log(
        "=== UPDATE KEPUTUSAN KANDIDAT ==="
      );

      console.log({
        applyId,
        decision,
        catatan,
      });

      // --------------------------------------------------------
      // SERVICE
      // --------------------------------------------------------

      const result =
        await hasilTesService.updateCandidateDecision(
          applyId,
          {
            decision:
              decision as
                | "not_passed"
                | "without_note"
                | "with_note",
            catatan,
          }
        );

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res
        .status(200)
        .json({
          success:
            result.success,

          message:
            result.message,

          data: {
            applyId:
              result.data
                .applyId,

            decision:
              result.data
                .decision,

            catatan:
              result.data
                .catatan,

            status:
              result.data
                .status,

            automaticStatus:
              result.data
                .automaticStatus,

            scoreStatus:
              result.data
                .scoreStatus,

            totalScore:
              result.data
                .totalScore,

            passingScore:
              result.data
                .passingScore,

            passed:
              result.data
                .passed,

            updatedAt:
              result.data
                .updatedAt ??
              null,
          },
        });
    } catch (error) {
      console.error(
        "UPDATE CANDIDATE DECISION ERROR:",
        error
      );

      next(error);
    }
  }

  // ============================================================
  // GET DETAIL
  // GET /api/rekrutmen/hasil-tes/:id
  // ============================================================

  async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const attemptId =
        String(
          req.params.id ||
            ""
        ).trim();

      console.log(
        "GET HASIL TES DETAIL ID:",
        attemptId
      );

      if (!attemptId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Attempt ID wajib diisi",
          });
      }

      const result =
        await hasilTesService.getById(
          attemptId
        );

      if (!result) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Hasil tes tidak ditemukan",
          });
      }

      console.log(
        "[GET DETAIL] HASIL",
        {
          attemptId,

          questionType:
            (result as any)
              .questionType,

          multipleChoiceScore:
            (result as any)
              .multipleChoiceScore,

          essayScore:
            (result as any)
              .essayScore,

          audioScore:
            (result as any)
              .audioScore,

          totalNilai:
            (result as any)
              .totalNilai,

          finalTotalNilai:
            (result as any)
              .finalTotalNilai,

          finalPassingScore:
            (result as any)
              .finalPassingScore,

          finalStatus:
            (result as any)
              .finalStatus,

          automaticStatus:
            (result as any)
              .automaticStatus,

          scoreStatus:
            (result as any)
              .scoreStatus,

          decision:
            (result as any)
              .decision,

          catatan:
            (result as any)
              .catatan,
        }
      );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Detail hasil tes berhasil diambil",
          data:
            result,
        });
    } catch (error) {
      console.error(
        "GET HASIL TES DETAIL ERROR:",
        error
      );

      next(error);
    }
  }

  // ============================================================
  // UPDATE NILAI
  //
  // PUT
  // /api/rekrutmen/hasil-tes/:attemptId/questions/:questionId
  // ============================================================

  async updateNilai(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const attemptId =
        String(
          req.params.attemptId ||
            ""
        ).trim();

      const questionId =
        String(
          req.params.questionId ||
            ""
        ).trim();

      const score =
        Number(
          req.body?.score
        );

      if (!attemptId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Attempt ID wajib diisi",
          });
      }

      if (!questionId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Question ID wajib diisi",
          });
      }

      if (
        !Number.isFinite(
          score
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Nilai harus berupa angka",
          });
      }

      if (
        score < 0 ||
        score > 100
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Nilai harus antara 0 sampai 100",
          });
      }

      console.log(
        "=== UPDATE NILAI SOAL ==="
      );

      console.log({
        attemptId,
        questionId,
        score,
      });

      const result =
        await hasilTesService.updateNilai(
          attemptId,
          questionId,
          score
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Nilai berhasil diperbarui",
          data:
            result,
        });
    } catch (error) {
      console.error(
        "UPDATE NILAI ERROR:",
        error
      );

      next(error);
    }
  }

  // ============================================================
  // DELETE
  // DELETE /api/rekrutmen/hasil-tes/:id
  // ============================================================

  async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const attemptId =
        String(
          req.params.id ||
            ""
        ).trim();

      if (!attemptId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Attempt ID wajib diisi",
          });
      }

      const result =
        await hasilTesService.delete(
          attemptId
        );

      return res
        .status(200)
        .json({
          success: true,
          message:
            "Hasil tes berhasil dihapus",
          data:
            result,
        });
    } catch (error) {
      console.error(
        "DELETE HASIL TES ERROR:",
        error
      );

      next(error);
    }
  }
}

export const hasilTesController =
  new HasilTesController();