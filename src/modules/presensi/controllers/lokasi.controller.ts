import type { Request, Response } from "express";
import lokasiService from "../services/lokasi.service";

function parseNumber(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error("Nilai numerik tidak valid.");
  }
  return n;
}

class LokasiController {
  // ==========================================================
  // CRUD LOKASI
  // ==========================================================
  async getAll(req: Request, res: Response) {
    try {
      const onlyActive = req.query.active === "true";
      const data = await lokasiService.getAll(onlyActive);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Gagal memuat lokasi.",
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const data = await lokasiService.getById(req.params.id);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || "Lokasi tidak ditemukan.",
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const payload = {
        nama: String(req.body.nama ?? "").trim(),
        alamat: req.body.alamat ?? null,
        latitude: parseNumber(req.body.latitude),
        longitude: parseNumber(req.body.longitude),
        radius_meter: parseNumber(req.body.radius_meter),
        is_active: req.body.is_active ?? true,
      };

      const data = await lokasiService.create(payload);

      return res.status(201).json({
        success: true,
        message: "Lokasi berhasil dibuat.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal membuat lokasi.",
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const payload: any = {};
      if (req.body.nama !== undefined)
        payload.nama = String(req.body.nama).trim();
      if (req.body.alamat !== undefined) payload.alamat = req.body.alamat;
      if (req.body.latitude !== undefined)
        payload.latitude = parseNumber(req.body.latitude);
      if (req.body.longitude !== undefined)
        payload.longitude = parseNumber(req.body.longitude);
      if (req.body.radius_meter !== undefined)
        payload.radius_meter = parseNumber(req.body.radius_meter);
      if (req.body.is_active !== undefined)
        payload.is_active = Boolean(req.body.is_active);

      const data = await lokasiService.update(req.params.id, payload);

      return res.json({
        success: true,
        message: "Lokasi berhasil diperbarui.",
        data,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui lokasi.",
      });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      await lokasiService.remove(req.params.id);
      return res.json({
        success: true,
        message: "Lokasi berhasil dinonaktifkan.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal menghapus lokasi.",
      });
    }
  }

  // ==========================================================
  // ASSIGNMENT per LOKASI
  // ==========================================================
  async getAssignedEmployees(req: Request, res: Response) {
    try {
      const data = await lokasiService.getAssignedEmployees(req.params.id);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Gagal memuat data karyawan.",
      });
    }
  }

  async setAssignedEmployees(req: Request, res: Response) {
    try {
      const employeeIds = Array.isArray(req.body.employeeIds)
        ? req.body.employeeIds
        : [];

      await lokasiService.setAssignedEmployees(req.params.id, employeeIds);

      return res.json({
        success: true,
        message: "Data karyawan berhasil disimpan.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal menyimpan data karyawan.",
      });
    }
  }

  // ==========================================================
  // ASSIGNMENT per KARYAWAN
  // ==========================================================
  async getEmployeeLocations(req: Request, res: Response) {
    try {
      const data = await lokasiService.getEmployeeLocations(req.params.id);
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Gagal memuat data lokasi.",
      });
    }
  }

  async setEmployeeLocations(req: Request, res: Response) {
    try {
      const locationIds = Array.isArray(req.body.locationIds)
        ? req.body.locationIds
        : [];

      await lokasiService.setEmployeeLocations(req.params.id, locationIds);

      return res.json({
        success: true,
        message: "Data lokasi berhasil disimpan.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Gagal menyimpan data lokasi.",
      });
    }
  }
}

export default new LokasiController();