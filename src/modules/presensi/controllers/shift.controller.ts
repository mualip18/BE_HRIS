import type { Request, Response } from "express";
import shiftService from "../services/shift.service";

class ShiftController {
  async getAll(_req: Request, res: Response) {
    try {
      const data = await shiftService.getAllAdmin();
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Gagal memuat shift.",
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = await shiftService.create(req.body);
      return res.status(201).json({
        success: true,
        message: "Shift berhasil dibuat.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal membuat shift.",
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const data = await shiftService.update(req.params.id, req.body);
      return res.json({
        success: true,
        message: "Shift berhasil diperbarui.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui shift.",
      });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      await shiftService.remove(req.params.id);
      return res.json({
        success: true,
        message: "Shift berhasil dinonaktifkan.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal menghapus shift.",
      });
    }
  }

  // ============================================================
  // ASSIGNMENT — CREATE
  // ============================================================
  async assign(req: Request, res: Response) {
    try {
      const { employee_id, shift_id, tanggal_mulai, tanggal_selesai } =
        req.body;

      const data = await shiftService.assign(
        employee_id,
        shift_id,
        tanggal_mulai,
        tanggal_selesai ?? null
      );

      return res.status(201).json({
        success: true,
        message: "Penempatan shift berhasil.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal menempatkan shift.",
      });
    }
  }

  // ============================================================
  // ASSIGNMENT — LIST
  // ============================================================
  async getAssignments(req: Request, res: Response) {
    try {
      const data = await shiftService.getAssignments({
        employeeId: req.query.employeeId as string | undefined,
        shiftId: req.query.shiftId as string | undefined,
        activeOnly: req.query.activeOnly === "true",
      });
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Gagal memuat assignment.",
      });
    }
  }

  // ============================================================
  // ASSIGNMENT — UPDATE STATUS ONLY
  // ============================================================
  async updateAssignment(req: Request, res: Response) {
    try {
      await shiftService.updateAssignmentStatus(
        req.params.id,
        req.body.status
      );
      return res.json({
        success: true,
        message: "Status assignment diperbarui.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui.",
      });
    }
  }

  // ============================================================
  // ASSIGNMENT — UPDATE FULL
  // ============================================================
  async updateAssignmentFull(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payload: any = {};

      if (req.body.employee_id !== undefined)
        payload.employee_id = String(req.body.employee_id);
      if (req.body.shift_id !== undefined)
        payload.shift_id = String(req.body.shift_id);
      if (req.body.tanggal_mulai !== undefined)
        payload.tanggal_mulai = req.body.tanggal_mulai;
      if (req.body.tanggal_selesai !== undefined)
        payload.tanggal_selesai = req.body.tanggal_selesai || null;
      if (req.body.status !== undefined)
        payload.status = String(req.body.status);

      const data = await shiftService.updateAssignment(id, payload);

      return res.json({
        success: true,
        message: "Penempatan berhasil diperbarui.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui penempatan.",
      });
    }
  }
}

export default new ShiftController();