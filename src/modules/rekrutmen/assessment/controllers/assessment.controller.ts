import { Request, Response } from "express";

import { assessmentService } from "../services/assessment.service";

import {
  validateCreateComponent,
  validateUpdateComponent,
  validateAssessmentScore,
} from "../validations/assessment.validation";

export class AssessmentController {
  // =====================================================
  // GET COMPONENTS
  // =====================================================

  async getComponents(
    req: Request,
    res: Response
  ) {
    try {
      const data =
        await assessmentService.getComponents();

      return res.json({
        success: true,
        message:
          "Data komponen assessment berhasil diambil.",
        data,
      });
    } catch (error: any) {
      console.error(
        "GET ASSESSMENT COMPONENTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Gagal mengambil komponen assessment.",
      });
    }
  }

  // =====================================================
  // GET COMPONENT BY ID
  // =====================================================

  async getComponentById(
    req: Request,
    res: Response
  ) {
    try {
      const { id } = req.params;

      const data =
        await assessmentService.getComponentById(
          id
        );

      if (!data) {
        return res.status(404).json({
          success: false,
          message:
            "Komponen assessment tidak ditemukan.",
        });
      }

      return res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error(
        "GET ASSESSMENT COMPONENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Gagal mengambil komponen assessment.",
      });
    }
  }

  // =====================================================
  // CREATE COMPONENT
  // =====================================================

  async createComponent(
    req: Request,
    res: Response
  ) {
    try {
      const payload = {
        name: String(req.body.name ?? ""),
        code: String(req.body.code ?? ""),
        weight: Number(req.body.weight),
        sortOrder:
          req.body.sortOrder === undefined
            ? 0
            : Number(req.body.sortOrder),
      };

      const validation =
        validateCreateComponent(payload);

      if (validation) {
        return res.status(400).json({
          success: false,
          message: validation,
        });
      }

      const data =
        await assessmentService.createComponent(
          payload
        );

      return res.status(201).json({
        success: true,
        message:
          "Komponen assessment berhasil dibuat.",
        data,
      });
    } catch (error: any) {
      console.error(
        "CREATE ASSESSMENT COMPONENT ERROR:",
        error
      );

      if (
        error?.code === "23505"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Nama atau kode komponen sudah digunakan.",
        });
      }

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Gagal membuat komponen assessment.",
      });
    }
  }

  // =====================================================
  // UPDATE COMPONENT
  // =====================================================

  async updateComponent(
    req: Request,
    res: Response
  ) {
    try {
      const { id } = req.params;

      const payload = {
        name:
          req.body.name !== undefined
            ? String(req.body.name)
            : undefined,

        code:
          req.body.code !== undefined
            ? String(req.body.code)
            : undefined,

        weight:
          req.body.weight !== undefined
            ? Number(req.body.weight)
            : undefined,

        sortOrder:
          req.body.sortOrder !== undefined
            ? Number(req.body.sortOrder)
            : undefined,
      };

      const validation =
        validateUpdateComponent(payload);

      if (validation) {
        return res.status(400).json({
          success: false,
          message: validation,
        });
      }

      const data =
        await assessmentService.updateComponent(
          id,
          payload
        );

      if (!data) {
        return res.status(404).json({
          success: false,
          message:
            "Komponen assessment tidak ditemukan.",
        });
      }

      return res.json({
        success: true,
        message:
          "Komponen assessment berhasil diperbarui.",
        data,
      });
    } catch (error: any) {
      console.error(
        "UPDATE ASSESSMENT COMPONENT ERROR:",
        error
      );

      if (
        error?.code === "23505"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Nama atau kode komponen sudah digunakan.",
        });
      }

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Gagal memperbarui komponen assessment.",
      });
    }
  }

  // =====================================================
  // TOGGLE COMPONENT
  // =====================================================

  async toggleComponent(
    req: Request,
    res: Response
  ) {
    try {
      const { id } = req.params;

      const data =
        await assessmentService.toggleComponent(
          id
        );

      if (!data) {
        return res.status(404).json({
          success: false,
          message:
            "Komponen assessment tidak ditemukan.",
        });
      }

      return res.json({
        success: true,
        message:
          data.isActive
            ? "Komponen berhasil diaktifkan."
            : "Komponen berhasil dinonaktifkan.",
        data,
      });
    } catch (error: any) {
      console.error(
        "TOGGLE ASSESSMENT COMPONENT ERROR:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Gagal mengubah status komponen.",
      });
    }
  }

  // =====================================================
  // SAVE SCORE
  // =====================================================

  async saveScore(
    req: Request,
    res: Response
  ) {
    try {
      const payload = {
        applyId: Number(req.body.applyId),

        componentId: String(
          req.body.componentId ?? ""
        ),

        score:
          req.body.score === null ||
          req.body.score === undefined ||
          req.body.score === ""
            ? null
            : Number(req.body.score),

        notes:
          req.body.notes === undefined
            ? null
            : String(req.body.notes),

        sourceAttemptId:
          req.body.sourceAttemptId ||
          null,
      };

      const validation =
        validateAssessmentScore(payload);

      if (validation) {
        return res.status(400).json({
          success: false,
          message: validation,
        });
      }

      const data =
        await assessmentService.saveScore(
          payload
        );

      return res.json({
        success: true,
        message:
          "Nilai assessment berhasil disimpan.",
        data,
      });
    } catch (error: any) {
      console.error(
        "SAVE ASSESSMENT SCORE ERROR:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error?.message ||
          "Gagal menyimpan nilai assessment.",
      });
    }
  }

  // =====================================================
  // RESULTS
  // =====================================================

  async getResults(
    req: Request,
    res: Response
  ) {
    try {
      const result =
        await assessmentService.getResults();

      return res.json({
        success: true,
        message:
          "Hasil assessment berhasil diambil.",
        components: result.components,
        data: result.data,
      });
    } catch (error: any) {
      console.error(
        "GET ASSESSMENT RESULTS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Gagal mengambil hasil assessment.",
      });
    }
  }

  // =====================================================
  // SELECTION HISTORY
  // =====================================================

  async getSelectionHistory(
    req: Request,
    res: Response
  ) {
    try {
      const applyId = Number(
        req.params.applyId
      );

      if (
        !Number.isInteger(applyId) ||
        applyId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Apply ID tidak valid.",
        });
      }

      const data =
        await assessmentService.getSelectionHistory(
          applyId
        );

      return res.json({
        success: true,
        message:
          "Riwayat seleksi berhasil diambil.",
        data,
      });
    } catch (error: any) {
      console.error(
        "GET SELECTION HISTORY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Gagal mengambil riwayat seleksi.",
      });
    }
  }
}

export const assessmentController =
  new AssessmentController();