import type {
  Request,
  Response,
} from "express";

import faceService
  from "../services/face.service";

import presensiRepository
  from "../repositories/presensi.repository";

class FaceController {
  async getStatus(
    req: Request,
    res: Response
  ) {
    try {
      const userUuid =
        (req as any).user?.id;

      if (!userUuid) {
        return res.status(401).json({
          success: false,
          message:
            "User tidak terautentikasi",
        });
      }

      const employee =
        await presensiRepository
          .getActiveEmployeeByUserUuid(
            userUuid
          );

      if (!employee) {
        return res.status(403).json({
          success: false,
          message:
            "Anda bukan karyawan aktif.",
        });
      }

      const status =
        await faceService.getStatus(
          employee.id
        );

      return res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error(
        "FACE STATUS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Gagal mengambil status wajah.",
      });
    }
  }

  async register(
    req: Request,
    res: Response
  ) {
    try {
      const userUuid =
        (req as any).user?.id;

      if (!userUuid) {
        return res.status(401).json({
          success: false,
          message:
            "User tidak terautentikasi",
        });
      }

      const employee =
        await presensiRepository
          .getActiveEmployeeByUserUuid(
            userUuid
          );

      if (!employee) {
        return res.status(403).json({
          success: false,
          message:
            "Anda bukan karyawan aktif.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Foto wajah wajib dikirim.",
        });
      }

      const extension =
        req.file.mimetype ===
        "image/png"
          ? "png"
          : req.file.mimetype ===
              "image/webp"
            ? "webp"
            : "jpg";

      const fileName =
        `employee-${employee.id}-${Date.now()}.${extension}`;

      const fotoPath =
        await faceService.savePhoto(
          req.file.buffer,
          "faces",
          fileName
        );

      /**
       * enroll() sekarang langsung menyimpan
       * embedding + fotoPath ke repository.
       */
      const verification =
        await faceService.enroll(
          employee.id,
          req.file.buffer,
          fotoPath
        );

      return res.status(201).json({
        success: true,

        message:
          "Wajah berhasil didaftarkan.",

        data: {
          registered: true,

          similarity:
            verification.similarity,

          confidence:
            verification.confidence,

          real:
            verification.real,

          live:
            verification.live,

          faceId:
            verification.face.id,

          fotoPath,
        },
      });
    } catch (error) {
      console.error(
        "FACE REGISTER ERROR:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mendaftarkan wajah.",
      });
    }
  }

  async verify(
    req: Request,
    res: Response
  ) {
    try {
      const userUuid =
        (req as any).user?.id;

      if (!userUuid) {
        return res.status(401).json({
          success: false,
          message:
            "User tidak terautentikasi",
        });
      }

      const employee =
        await presensiRepository
          .getActiveEmployeeByUserUuid(
            userUuid
          );

      if (!employee) {
        return res.status(403).json({
          success: false,
          message:
            "Anda bukan karyawan aktif.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Foto wajah wajib dikirim.",
        });
      }

      const result =
        await faceService.verify(
          employee.id,
          req.file.buffer
        );

      return res.json({
        success: true,

        message:
          result.matched
            ? "Wajah cocok."
            : "Wajah tidak cocok.",

        data: result,
      });
    } catch (error) {
      console.error(
        "FACE VERIFY ERROR:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal melakukan verifikasi wajah.",
      });
    }
  }
}

export default
  new FaceController();