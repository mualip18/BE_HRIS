import {
  Request,
  Response,
} from "express";

import {
  assessmentScoringService,
} from "../services/assessmentScoring.service";

export class AssessmentScoringController {

  // =========================================================
  // GET
  // =========================================================

  async getConfig(
    req: Request,
    res: Response
  ) {

    try {

      const {
        testId,
      } = req.params;

      const data =
        await assessmentScoringService
          .getConfig(testId);

      return res.json({
        success: true,
        message:
          "Konfigurasi scoring assessment berhasil diambil.",
        data,
      });

    } catch (error: any) {

      console.error(
        "GET ASSESSMENT SCORING ERROR:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Gagal mengambil konfigurasi scoring.",
      });
    }
  }

  // =========================================================
  // SAVE
  // =========================================================

  async saveConfig(
    req: Request,
    res: Response
  ) {

    try {

      const {
        testId,
      } = req.params;

      const components =
        Array.isArray(
          req.body.components
        )
          ? req.body.components
          : [];

      const payload =
        components.map(
          (item: any) => ({
            componentId:
              String(
                item.componentId ??
                ""
              ),

            weight:
              Number(
                item.weight
              ),
          })
        );

      const data =
        await assessmentScoringService
          .saveConfig(
            testId,
            payload
          );

      return res.json({
        success: true,
        message:
          "Konfigurasi scoring berhasil disimpan.",
        data,
      });

    } catch (error: any) {

      console.error(
        "SAVE ASSESSMENT SCORING ERROR:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Gagal menyimpan konfigurasi scoring.",
      });
    }
  }
}

export const assessmentScoringController =
  new AssessmentScoringController();