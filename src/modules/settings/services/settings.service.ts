import db from "../../../config/db";

import type {
  SettingsMenuItem,
  SettingsMenuResponse,
} from "../types/settings.types";

/* ================================================================
   SETTINGS REPOSITORY

   Tugas:
   - Mengatur konfigurasi menu user
   - Mengecek apakah user adalah employee aktif
   - Menentukan apakah menu Presensi boleh ditampilkan

   SUMBER STATUS EMPLOYEE:
   hris_employees.status_karyawan

   RELASI:
   users.uuid
       ↓
   hris_employees.user_id
================================================================ */

class SettingsRepository {

  /* ==============================================================
     GET MENU USER LOGIN
  ============================================================== */

  async getUserMenu(
    userUuid: string
  ): Promise<SettingsMenuResponse> {

    console.log(
      "\n============================================================"
    );

    console.log(
      "[SETTINGS DEBUG] GET USER MENU"
    );

    console.log(
      "JWT USER UUID:",
      userUuid
    );

    /* ============================================================
       CEK EMPLOYEE AKTIF

       Kita sengaja melakukan pengecekan di module SETTINGS.

       HRIS tetap menjadi sumber data employee.

       Settings hanya menentukan:
       "Apakah user ini boleh melihat menu Presensi?"
    ============================================================ */

    const employeeResult =
      await db.query(
        `
          SELECT
            e.id,
            e.nama,
            e.status_karyawan,
            e.user_id,
            e.nipy,
            e.jabatan

          FROM hris_employees e

          WHERE e.user_id = $1

            AND UPPER(
              TRIM(
                COALESCE(
                  e.status_karyawan,
                  ''
                )
              )
            ) = 'AKTIF'

          LIMIT 1
        `,
        [
          userUuid,
        ]
      );

    const isActiveEmployee =
      employeeResult.rows.length > 0;

    const isEmployee =
      employeeResult.rows.length > 0;

    console.log(
      "[SETTINGS DEBUG] isEmployee:",
      isEmployee
    );

    console.log(
      "[SETTINGS DEBUG] isActiveEmployee:",
      isActiveEmployee
    );

    if (
      employeeResult.rows.length > 0
    ) {

      console.log(
        "[SETTINGS DEBUG] EMPLOYEE AKTIF:"
      );

      console.log({
        id:
          employeeResult.rows[0].id,

        nama:
          employeeResult.rows[0].nama,

        statusKaryawan:
          employeeResult.rows[0]
            .status_karyawan,

        nipy:
          employeeResult.rows[0].nipy,

        jabatan:
          employeeResult.rows[0].jabatan,
      });

    } else {

      console.log(
        "[SETTINGS DEBUG] User bukan employee aktif."
      );
    }

    /* ============================================================
       MENU DASAR

       Semua user login mendapatkan menu ini.
    ============================================================ */

    const menu: SettingsMenuItem[] = [

      {
        title:
          "Dashboard",

        icon:
          "mdi-view-dashboard",

        to:
          "/user/dashboard",
      },

      {
        title:
          "Lowongan",

        icon:
          "mdi-briefcase",

        to:
          "/user/lowongan",
      },

      {
        title:
          "Lamaran Saya",

        icon:
          "mdi-file-document",

        to:
          "/user/lamaran",
      },

      {
        title:
          "Pesan",

        icon:
          "mdi-email",

        to:
          "/user/pesan",
      },

      {
        title:
          "Profil",

        icon:
          "mdi-account",

        children: [

          {
            title:
              "Profil Saya",

            icon:
              "",

            to:
              "/user/profile",
          },

          {
            title:
              "Pengaturan",

            icon:
              "",

            to:
              "/user/pengaturan",
          },

        ],
      },

    ];

    /* ============================================================
       MENU PRESENSI

       HANYA EMPLOYEE AKTIF

       status_karyawan = AKTIF
    ============================================================ */

    if (
      isActiveEmployee
    ) {

      menu.push({

        title:
          "Presensi",

        icon:
          "mdi-calendar-check",

        to:
          "/user/presensi",

      });

      console.log(
        "[SETTINGS DEBUG] Menu Presensi DITAMBAHKAN."
      );

    } else {

      console.log(
        "[SETTINGS DEBUG] Menu Presensi TIDAK DITAMBAHKAN."
      );
    }

    console.log(
      "[SETTINGS DEBUG] TOTAL MENU:",
      menu.length
    );

    console.log(
      "============================================================\n"
    );

    return {

      success:
        true,

      isEmployee,

      isActiveEmployee,

      data:
        menu,

    };
  }
}

export default new SettingsRepository();