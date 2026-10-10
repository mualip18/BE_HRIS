
import type {
  Request,
  Response,
} from "express";

import employeeService
  from "../services/employee.service";

import type {
  EmployeeUpdatePayload,
  EmployeeStatus,
  JenisKepegawaian,
} from "../types/employee.types";


// ============================================================
// VALIDASI TANGGAL
// ============================================================

function isValidDate(
  value: unknown
): value is string {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return true;
  }

  if (
    typeof value !== "string"
  ) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(
    value
  );
}


// ============================================================
// VALIDASI STATUS KARYAWAN
// ============================================================

function isValidStatus(
  value: unknown
): value is EmployeeStatus {

  return (
    value === "AKTIF" ||
    value === "NONAKTIF"
  );
}


// ============================================================
// VALIDASI JENIS KEPEGAWAIAN
// ============================================================

function isValidJenis(
  value: unknown
): value is JenisKepegawaian {

  return (
    value === "TETAP" ||
    value === "KONTRAK" ||
    value === "PARUH_WAKTU"
  );
}


// ============================================================
// EMPLOYEE CONTROLLER
// ============================================================

class EmployeeController {


  /* ============================================================
     GET ALL
     
     GET /api/hris/employees
  ============================================================ */

  async getAll(
    req: Request,
    res: Response
  ) {

    try {

      const result =
        await employeeService.getAll({

          page:
            Number(
              req.query.page ?? 1
            ),

          limit:
            Number(
              req.query.limit ?? 10
            ),

          search:
            typeof req.query.search ===
            "string"
              ? req.query.search
              : "",

          status:
            typeof req.query.status ===
            "string"
              ? req.query.status
              : "SEMUA",

          posisi:
            typeof req.query.posisi ===
            "string"
              ? req.query.posisi
              : "SEMUA",

        });

      return res.json(
        result
      );

    } catch (error) {

      console.error(
        "GET employees error:",
        error
      );

      return res.status(
        500
      ).json({

        success: false,

        message:
          "Gagal mengambil data karyawan",

      });
    }
  }


  /* ============================================================
     GET BY ID
     
     GET /api/hris/employees/:id
  ============================================================ */

  async getById(
    req: Request,
    res: Response
  ) {

    try {

      const employee =
        await employeeService.getById(
          req.params.id
        );

      if (!employee) {

        return res.status(
          404
        ).json({

          success: false,

          message:
            "Data karyawan tidak ditemukan",

        });
      }

      return res.json({

        success: true,

        data:
          employee,

      });

    } catch (error) {

      console.error(
        "GET employee detail error:",
        error
      );

      return res.status(
        500
      ).json({

        success: false,

        message:
          "Gagal mengambil detail karyawan",

      });
    }
  }


  /* ============================================================
     UPDATE
     
     PATCH /api/hris/employees/:id
  ============================================================ */

  async update(
    req: Request,
    res: Response
  ) {

    try {

      const body =
        req.body ?? {};


      // ========================================================
      // VALIDASI STATUS
      // ========================================================

      if (
        body.statusKaryawan !==
          undefined &&
        !isValidStatus(
          body.statusKaryawan
        )
      ) {

        return res.status(
          400
        ).json({

          success: false,

          message:
            "Status karyawan hanya AKTIF atau NONAKTIF",

        });
      }


      // ========================================================
      // VALIDASI JENIS KEPEGAWAIAN
      // ========================================================

      if (
        body.jenisKepegawaian !==
          undefined &&
        body.jenisKepegawaian !==
          null &&
        !isValidJenis(
          body.jenisKepegawaian
        )
      ) {

        return res.status(
          400
        ).json({

          success: false,

          message:
            "Jenis kepegawaian hanya TETAP, KONTRAK, atau PARUH_WAKTU",

        });
      }


      // ========================================================
      // VALIDASI TANGGAL
      // ========================================================

      if (
        !isValidDate(
          body.tanggalMasuk
        ) ||
        !isValidDate(
          body.tmt
        ) ||
        !isValidDate(
          body.tst
        )
      ) {

        return res.status(
          400
        ).json({

          success: false,

          message:
            "Format tanggal harus YYYY-MM-DD",

        });
      }


      // ========================================================
      // VALIDASI TMT / TST
      // ========================================================

      if (
        body.tmt &&
        body.tst &&
        body.tst <
          body.tmt
      ) {

        return res.status(
          400
        ).json({

          success: false,

          message:
            "TST tidak boleh lebih awal dari TMT",

        });
      }


      // ========================================================
      // PAYLOAD
      // ========================================================

      const payload:
        EmployeeUpdatePayload = {

        nipy:
          body.nipy !==
          undefined
            ? body.nipy
            : undefined,

        jabatan:
          body.jabatan !==
          undefined
            ? body.jabatan
            : undefined,

        posisi:
          body.posisi !==
          undefined
            ? body.posisi
            : undefined,

        lokasi:
          body.lokasi !==
          undefined
            ? body.lokasi
            : undefined,

        tanggalMasuk:
          body.tanggalMasuk !==
          undefined
            ? body.tanggalMasuk
            : undefined,

        jenisKepegawaian:
          body.jenisKepegawaian !==
          undefined
            ? body.jenisKepegawaian
            : undefined,

        tmt:
          body.tmt !==
          undefined
            ? body.tmt
            : undefined,

        tst:
          body.tst !==
          undefined
            ? body.tst
            : undefined,

        statusKaryawan:
          body.statusKaryawan !==
          undefined
            ? body.statusKaryawan
            : undefined,

      };


      // ========================================================
      // UPDATE DATABASE
      // ========================================================

      const employee =
        await employeeService.update(
          req.params.id,
          payload
        );


      if (!employee) {

        return res.status(
          404
        ).json({

          success: false,

          message:
            "Data karyawan tidak ditemukan",

        });
      }


      return res.json({

        success: true,

        message:
          "Data kepegawaian berhasil diperbarui",

        data:
          employee,

      });

    } catch (error) {

      console.error(
        "UPDATE employee error:",
        error
      );

      return res.status(
        500
      ).json({

        success: false,

        message:
          "Gagal memperbarui data karyawan",

      });
    }
  }
}


// ============================================================
// EXPORT
// ============================================================

export default new EmployeeController();
