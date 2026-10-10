import type { Request, Response } from "express";

import presensiService from "../services/presensi.service";
import faceService from "../services/face.service";
import presensiRepository from "../repositories/presensi.repository";
import shiftService from "../services/shift.service";
import lokasiService from "../services/lokasi.service";

function parseOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error("Nilai koordinat tidak valid.");
  return number;
}

class PresensiController {
  // ==========================================================
  // GET MY STATUS
  // ==========================================================
  async getMyStatus(req: Request, res: Response) {
    try {
      const userUuid = (req as any).user?.id;
      if (!userUuid) {
        return res.status(401).json({
          success: false,
          message: "User tidak terautentikasi",
        });
      }

      const result = await presensiService.getMyStatus(userUuid);
      return res.json({ success: true, data: result });
    } catch (error) {
      console.error("GET presensi status error:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil status presensi",
      });
    }
  }

  // ==========================================================
  // CHECK IN
  // ==========================================================
  async checkIn(req: Request, res: Response) {
    try {
      const userUuid = (req as any).user?.id;
      if (!userUuid) {
        return res.status(401).json({
          success: false,
          message: "User tidak terautentikasi",
        });
      }

      const employee =
        await presensiRepository.getActiveEmployeeByUserUuid(userUuid);

      if (!employee) {
        return res.status(403).json({
          success: false,
          message: "Anda bukan karyawan aktif.",
        });
      }

      const latitude = parseOptionalNumber(req.body.latitude);
      const longitude = parseOptionalNumber(req.body.longitude);

      let fotoPath: string | null = null;
      let faceVerified = false;
      let faceSimilarity: number | null = null;

      const metode = req.body.metode ?? (req.file ? "FOTO" : "MANUAL");

      if (metode === "FACE_RECOGNITION") {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message:
              "Foto wajah wajib dikirim untuk metode face recognition.",
          });
        }

        const verification = await faceService.verify(
          employee.id,
          req.file.buffer
        );

        if (!verification.matched) {
          return res.status(403).json({
            success: false,
            message: "Wajah tidak cocok dengan wajah yang terdaftar.",
            data: verification,
          });
        }

        faceVerified = true;
        faceSimilarity = verification.similarity;
      }

      if (req.file) {
        const extension =
          req.file.mimetype === "image/png"
            ? "png"
            : req.file.mimetype === "image/webp"
              ? "webp"
              : "jpg";

        const fileName = `employee-${employee.id}-masuk-${Date.now()}.${extension}`;
        fotoPath = await faceService.savePhoto(
          req.file.buffer,
          "presensi",
          fileName
        );
      }

      // VALIDASI RADIUS
      await lokasiService.validateRadius(latitude, longitude);

      const result = await presensiService.checkIn(userUuid, {
        latitude,
        longitude,
        alamat: req.body.alamat || null,
        foto: fotoPath,
        metode,
        faceVerified,
        faceSimilarity,
        catatan: req.body.catatan || null,
      });

      return res.status(201).json({
        success: true,
        message: "Presensi masuk berhasil",
        data: result,
      });
    } catch (error) {
      console.error("CHECK IN error:", error);
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal melakukan presensi masuk",
      });
    }
  }

  // ==========================================================
  // CHECK OUT
  // ==========================================================
  async checkOut(req: Request, res: Response) {
    try {
      const userUuid = (req as any).user?.id;
      if (!userUuid) {
        return res.status(401).json({
          success: false,
          message: "User tidak terautentikasi",
        });
      }

      const employee =
        await presensiRepository.getActiveEmployeeByUserUuid(userUuid);

      if (!employee) {
        return res.status(403).json({
          success: false,
          message: "Anda bukan karyawan aktif.",
        });
      }

      const latitude = parseOptionalNumber(req.body.latitude);
      const longitude = parseOptionalNumber(req.body.longitude);

      let fotoPath: string | null = null;
      let faceVerified = false;
      let faceSimilarity: number | null = null;

      const metode = req.body.metode ?? (req.file ? "FOTO" : "MANUAL");

      if (metode === "FACE_RECOGNITION") {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message:
              "Foto wajah wajib dikirim untuk metode face recognition.",
          });
        }

        const verification = await faceService.verify(
          employee.id,
          req.file.buffer
        );

        if (!verification.matched) {
          return res.status(403).json({
            success: false,
            message: "Wajah tidak cocok dengan wajah yang terdaftar.",
            data: verification,
          });
        }

        faceVerified = true;
        faceSimilarity = verification.similarity;
      }

      if (req.file) {
        const extension =
          req.file.mimetype === "image/png"
            ? "png"
            : req.file.mimetype === "image/webp"
              ? "webp"
              : "jpg";

        const fileName = `employee-${employee.id}-pulang-${Date.now()}.${extension}`;
        fotoPath = await faceService.savePhoto(
          req.file.buffer,
          "presensi",
          fileName
        );
      }

      await lokasiService.validateRadius(latitude, longitude);

      const result = await presensiService.checkOut(userUuid, {
        latitude,
        longitude,
        alamat: req.body.alamat || null,
        foto: fotoPath,
        metode,
        faceVerified,
        faceSimilarity,
        catatan: req.body.catatan || null,
      });

      return res.json({
        success: true,
        message: "Presensi pulang berhasil",
        data: result,
      });
    } catch (error) {
      console.error("CHECK OUT error:", error);
      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal melakukan presensi pulang",
      });
    }
  }

  // ==========================================================
  // HISTORY
  // ==========================================================
  async getHistory(req: Request, res: Response) {
    try {
      const userUuid = (req as any).user?.id;
      if (!userUuid) {
        return res.status(401).json({
          success: false,
          message: "User tidak terautentikasi",
        });
      }

      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const endDate =
        typeof req.query.endDate === "string" ? req.query.endDate : today;
      const startDate =
        typeof req.query.startDate === "string"
          ? req.query.startDate
          : endDate;

      const data = await presensiService.getMyHistory(
        userUuid,
        startDate,
        endDate
      );

      return res.json({ success: true, data });
    } catch (error) {
      console.error("GET presensi history error:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil riwayat presensi",
      });
    }
  }

  // ==========================================================
  // SHIFTS (user)
  // ==========================================================
  async getShifts(_req: Request, res: Response) {
    try {
      const data = await shiftService.getAll();
      return res.json({ success: true, data });
    } catch (error) {
      console.error("GET shifts error:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil data shift",
      });
    }
  }

  // ==========================================================
  // REKAP (harian)
  // ==========================================================
  async getRekap(req: Request, res: Response) {
    try {
      const { startDate, endDate, employeeId, shiftId, status } =
        req.query as Record<string, string | undefined>;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Periode wajib diisi.",
        });
      }

      const data = await presensiService.getRekap({
        startDate,
        endDate,
        employeeId,
        shiftId,
        status,
      });

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error("GET rekap error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Gagal memuat rekap.",
      });
    }
  }

  // ==========================================================
  // REKAP BULANAN
  // ==========================================================
  async getRekapBulanan(req: Request, res: Response) {
    try {
      const month = Number(req.query.month);
      const year = Number(req.query.year);

      const employeeIdsParam = req.query.employeeIds;
      let employeeIds: string[] | undefined = undefined;

      if (typeof employeeIdsParam === "string" && employeeIdsParam.trim()) {
        employeeIds = employeeIdsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const data = await presensiService.getRekapBulanan(
        month,
        year,
        employeeIds
      );

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error("GET rekap bulanan error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Gagal memuat rekap bulanan.",
      });
    }
  }
}

export default new PresensiController();