import type { Request, Response } from "express";

import cutiService from "../services/cuti.service";

class CutiController {
  // ============================================================
  // JENIS CUTI
  // ============================================================
  async getTypes(_req: Request, res: Response) {
    try {
      const data = await cutiService.getLeaveTypes();
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Gagal mengambil jenis cuti.",
      });
    }
  }

  async createType(req: Request, res: Response) {
    try {
      const data = await cutiService.createLeaveType(req.body);
      return res.status(201).json({
        success: true,
        message: "Jenis cuti berhasil dibuat.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal membuat jenis cuti.",
      });
    }
  }

  async updateType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await cutiService.updateLeaveType(id, req.body);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Jenis cuti tidak ditemukan.",
        });
      }

      return res.json({
        success: true,
        message: "Jenis cuti berhasil diperbarui.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui jenis cuti.",
      });
    }
  }

  async deleteType(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await cutiService.deleteLeaveType(id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Jenis cuti tidak ditemukan.",
        });
      }

      return res.json({
        success: true,
        message: "Jenis cuti berhasil dihapus.",
      });
    } catch {
      return res.status(400).json({
        success: false,
        message:
          "Jenis cuti tidak dapat dihapus karena sudah digunakan.",
      });
    }
  }

  // ============================================================
  // EMPLOYEE
  // ============================================================
  async getEmployees(_req: Request, res: Response) {
    try {
      const data = await cutiService.getEmployees();
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Gagal mengambil data karyawan.",
      });
    }
  }

  // ============================================================
  // BALANCE
  // ============================================================
  async getBalances(req: Request, res: Response) {
    try {
      const year = Number(req.query.year) || new Date().getFullYear();
      const data = await cutiService.getBalances(year);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Gagal mengambil jatah cuti.",
      });
    }
  }

  async updateBalance(req: Request, res: Response) {
    try {
      const data = await cutiService.updateBalance(req.body);
      return res.json({
        success: true,
        message: "Jatah cuti berhasil disimpan.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal menyimpan jatah cuti.",
      });
    }
  }

  // ============================================================
  // REQUEST
  // ============================================================
  async getRequests(req: Request, res: Response) {
    try {
      const status = req.query.status ? String(req.query.status) : "ALL";
      const year = req.query.year
        ? Number(req.query.year)
        : new Date().getFullYear();

      const data = await cutiService.getRequests({ status, year });
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Gagal mengambil data cuti.",
      });
    }
  }

  async createRequest(req: Request, res: Response) {
    try {
      const data = await cutiService.createRequest(req.body);
      return res.status(201).json({
        success: true,
        message: "Data cuti berhasil dibuat.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal membuat data cuti.",
      });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const authUser: any = (req as any).user;

      // ⚠️ users.id = INTEGER
      const approvedBy = authUser?.id ? Number(authUser.id) : null;

      if (!approvedBy || !Number.isFinite(approvedBy)) {
        return res.status(401).json({
          success: false,
          message: "User tidak ditemukan.",
        });
      }

      const data = await cutiService.updateStatus(
        id,
        req.body,
        approvedBy
      );

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Data cuti tidak ditemukan.",
        });
      }

      return res.json({
        success: true,
        message: "Status cuti berhasil diperbarui.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui status cuti.",
      });
    }
  }
}

export default new CutiController();