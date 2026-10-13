import db from "../../../config/db";

import type {

  Employee,

  EmployeeListQuery,

  EmployeeUpdatePayload,

  EmployeeStatus,

  JenisKepegawaian,

} from "../types/employee.types";

// ============================================================

// HELPERS

// ============================================================

function toDateString(

  value: unknown

): string | null {

  if (

    value === null ||

    value === undefined ||

    value === ""

  ) {

    return null;

  }

  // PostgreSQL DATE biasanya:

  //

  // 2026-06-18

  //

  // atau:

  //

  // 2026-06-18T17:00:00.000Z

  if (

    typeof value === "string"

  ) {

    const match =

      value.match(

        /^(\d{4}-\d{2}-\d{2})/

      );

    if (match) {

      return match[1];

    }

  }

  // JavaScript Date

  if (

    value instanceof Date

  ) {

    if (

      Number.isNaN(

        value.getTime()

      )

    ) {

      return null;

    }

    const year =

      value.getFullYear();

    const month =

      String(

        value.getMonth() + 1

      ).padStart(

        2,

        "0"

      );

    const day =

      String(

        value.getDate()

      ).padStart(

        2,

        "0"

      );

    return `${year}-${month}-${day}`;

  }

  // Fallback

  const stringValue =

    String(value);

  const match =

    stringValue.match(

      /^(\d{4}-\d{2}-\d{2})/

    );

  if (match) {

    return match[1];

  }

  console.log(

    "[EMPLOYEE DEBUG] Gagal membaca tanggal:",

    value

  );

  return null;

}

// ============================================================

// NORMALIZE NULLABLE STRING

// ============================================================

function normalizeNullableString(

  value: unknown

): string | null {

  if (

    value === null ||

    value === undefined

  ) {

    return null;

  }

  const text =

    String(value).trim();

  return text === ""

    ? null

    : text;

}

// ============================================================

// VALIDATE EMPLOYEE ID

// ============================================================

function validateEmployeeId(

  id: string

): boolean {

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(

    id

  );

}

// ============================================================

// VALIDATE DATE

// ============================================================

function validateDate(

  value:

    | string

    | null

    | undefined

): boolean {

  if (

    value === null ||

    value === undefined ||

    value === ""

  ) {

    return true;

  }

  if (

    !/^\d{4}-\d{2}-\d{2}$/.test(

      value

    )

  ) {

    return false;

  }

  const [

    year,

    month,

    day,

  ] =

    value

      .split("-")

      .map(Number);

  const date =

    new Date(

      year,

      month - 1,

      day

    );

  return (

    date.getFullYear() ===

      year &&

    date.getMonth() ===

      month - 1 &&

    date.getDate() ===

      day

  );

}

// ============================================================

// VALIDATE EMPLOYEE STATUS

// ============================================================

function validateEmployeeStatus(

  status:

    | string

    | undefined

    | null

): status is EmployeeStatus {

  return (

    status === "AKTIF" ||

    status === "NONAKTIF"

  );

}

// ============================================================

// VALIDATE JENIS KEPEGAWAIAN

// ============================================================

function validateJenisKepegawaian(

  jenis:

    | string

    | undefined

    | null

): jenis is JenisKepegawaian {

  return (

    jenis === "TETAP" ||

    jenis === "KONTRAK" ||

    jenis === "PARUH_WAKTU"

  );

}

// ============================================================

// EMPLOYEE REPOSITORY

// ============================================================

class EmployeeRepository {

  /* ============================================================

     ENSURE TABLE

  ============================================================ */

  async ensureTable(): Promise<void> {
    console.log("\n============================================================");
    console.log("[EMPLOYEE DEBUG] ensureTable()");
    console.log("Memastikan tabel dan kolom kepegawaian tersedia...");

    // Diagnosis menggunakan koneksi database yang sama dengan repository.
    const diagnostic = await db.query(`
      SELECT
        current_database() AS database_name,
        current_schema() AS schema_name,
        current_setting('search_path') AS search_path,
        to_regclass('public.hris_employees') AS employee_table
    `);

    console.log("[DATABASE DIAGNOSTIC]", JSON.stringify(diagnostic.rows[0]));

    if (!diagnostic.rows[0]?.employee_table) {
      throw new Error(
        `Tabel public.hris_employees tidak ditemukan pada database "${diagnostic.rows[0]?.database_name ?? "unknown"}". ` +
        "Pastikan DATABASE_URL Railway menunjuk ke database yang benar."
      );
    }

    // Hanya menambahkan kolom yang diperlukan; data karyawan tidak dihapus.
    await db.query(`
      ALTER TABLE public.hris_employees
        ADD COLUMN IF NOT EXISTS nipy VARCHAR(100),
        ADD COLUMN IF NOT EXISTS jenis_kepegawaian VARCHAR(30),
        ADD COLUMN IF NOT EXISTS tmt DATE,
        ADD COLUMN IF NOT EXISTS tst DATE;
    `);

    await db.query(`
      UPDATE public.hris_employees
      SET jenis_kepegawaian = NULL
      WHERE jenis_kepegawaian IS NOT NULL
        AND jenis_kepegawaian NOT IN ('TETAP', 'KONTRAK', 'PARUH_WAKTU');
    `);

    const columnsResult = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'hris_employees'
        AND column_name IN (
          'nipy', 'jenis_kepegawaian', 'tmt', 'tst',
          'tanggal_masuk', 'lokasi'
        )
      ORDER BY ordinal_position;
    `);
    console.log("[EMPLOYEE DEBUG] Kolom database:");
    console.table(columnsResult.rows);

    const dateResult = await db.query(`
      SELECT id, nama, nipy, tanggal_masuk, tmt, tst,
             lokasi, jenis_kepegawaian, status_karyawan
      FROM public.hris_employees
      ORDER BY created_at DESC NULLS LAST
      LIMIT 10;
    `);
    console.log("[EMPLOYEE DEBUG] 10 data employee terakhir:");
    console.table(dateResult.rows);
    console.log("============================================================\n");
  }

  private getSelect(): string {

    return `

      SELECT

        e.id,

        e.apply_id,

        e.lowongan_id,

        e.user_id,

        e.nama,

        e.email,

        e.nik,

        e.no_hp,

        e.tempat_lahir,

        e.tanggal_lahir,

        e.agama,

        e.jenis_kelamin,

        e.status_menikah,

        e.pendidikan_terakhir,

        e.provinsi,

        e.kota,

        e.kecamatan,

        e.alamat,

        e.instagram,

        e.tiktok,

        e.linkedin,

        e.twitter,

        e.posisi,

        e.jabatan,

        e.lembaga,

        e.lokasi,

        e.expected_location,

        e.gaji,

        e.nipy,

        e.jenis_kepegawaian,

        e.tmt,

        e.tst,

        e.tanggal_masuk,

        e.status_karyawan,

        e.tanggal_diterima,

        e.siap_bekerja,

        e.cv_file,

        e.ijazah_file,

        e.transkrip_file,

        e.pendukung_file,

        e.foto,

        e.created_at,

        e.updated_at

      FROM public.hris_employees e

    `;

  }

  /* ============================================================

     MAP EMPLOYEE

  ============================================================ */

  private mapEmployee(

    row: any

  ): Employee {

    const tanggalLahir =

      toDateString(

        row.tanggal_lahir

      );

    const tanggalMasuk =

      toDateString(

        row.tanggal_masuk

      );

    const tanggalDiterima =

      toDateString(

        row.tanggal_diterima

      );

    const siapBekerja =

      toDateString(

        row.siap_bekerja

      );

    const tmt =

      toDateString(

        row.tmt

      );

    const tst =

      toDateString(

        row.tst

      );

    const employee:

      Employee = {

      id:

        String(row.id),

      applyId:

        row.apply_id !== null &&

        row.apply_id !== undefined

          ? Number(row.apply_id)

          : null,

      lowonganId:

        row.lowongan_id !== null &&

        row.lowongan_id !== undefined

          ? Number(row.lowongan_id)

          : null,

      userId:

        row.user_id ??

        null,

      // ------------------------------------------------------

      // IDENTITAS

      // ------------------------------------------------------

      nama:

        row.nama ??

        "",

      email:

        row.email ??

        null,

      nik:

        row.nik ??

        null,

      noHp:

        row.no_hp ??

        null,

      tempatLahir:

        row.tempat_lahir ??

        null,

      tanggalLahir,

      agama:

        row.agama ??

        null,

      jenisKelamin:

        row.jenis_kelamin ??

        null,

      statusMenikah:

        row.status_menikah ??

        null,

      pendidikanTerakhir:

        row.pendidikan_terakhir ??

        null,

      // ------------------------------------------------------

      // ALAMAT

      // ------------------------------------------------------

      provinsi:

        row.provinsi ??

        null,

      kota:

        row.kota ??

        null,

      kecamatan:

        row.kecamatan ??

        null,

      alamat:

        row.alamat ??

        null,

      // ------------------------------------------------------

      // SOSIAL MEDIA

      // ------------------------------------------------------

      instagram:

        row.instagram ??

        null,

      tiktok:

        row.tiktok ??

        null,

      linkedin:

        row.linkedin ??

        null,

      twitter:

        row.twitter ??

        null,

      // ------------------------------------------------------

      // PEKERJAAN

      // ------------------------------------------------------

      posisi:

        row.posisi ??

        null,

      lembaga:

        row.lembaga ??

        null,

      lokasi:

        row.lokasi ??

        null,

      expectedLocation:

        row.expected_location ??

        null,

      jabatan:

        row.jabatan ??

        null,

      gaji:

        row.gaji ??

        null,

      // ------------------------------------------------------

      // SIAP BEKERJA

      // ------------------------------------------------------

      siapBekerja,

      // ------------------------------------------------------

      // KEPEGAWAIAN

      // ------------------------------------------------------

      nipy:

        row.nipy ??

        null,

      jenisKepegawaian:

        row.jenis_kepegawaian ??

        null,

      tmt,

      tst,

      tanggalMasuk,

      // ------------------------------------------------------

      // FILE

      // ------------------------------------------------------

      cvFile:

        row.cv_file ??

        null,

      ijazahFile:

        row.ijazah_file ??

        null,

      transkripFile:

        row.transkrip_file ??

        null,

      pendukungFile:

        row.pendukung_file ??

        null,

      // ------------------------------------------------------

      // STATUS

      // ------------------------------------------------------

      statusKaryawan:

        row.status_karyawan ===

        "NONAKTIF"

          ? "NONAKTIF"

          : "AKTIF",

      tanggalDiterima,

      // ------------------------------------------------------

      // FOTO

      // ------------------------------------------------------

      foto:

        row.foto ??

        null,

      // ------------------------------------------------------

      // AUDIT

      // ------------------------------------------------------

      createdAt:

        row.created_at

          ? String(

              row.created_at

            )

          : null,

      updatedAt:

        row.updated_at

          ? String(

              row.updated_at

            )

          : null,

    };

    return employee;

  }

  /* ============================================================

     GET ALL

  ============================================================ */

  async getAll(

    query: EmployeeListQuery = {}

  ) {

    const page =

      Math.max(

        Number(

          query.page

        ) || 1,

        1

      );

    const limit =

      Math.min(

        Math.max(

          Number(

            query.limit

          ) || 10,

          1

        ),

        1000

      );

    const offset =

      (page - 1) *

      limit;

    const search =

      String(

        query.search ??

          ""

      ).trim();

    const status =

      String(

        query.status ??

          "SEMUA"

      )

        .trim()

        .toUpperCase();

    const posisi =

      String(

        query.posisi ??

          "SEMUA"

      ).trim();

    const conditions:

      string[] = [];

    const params:

      any[] = [];

    // ========================================================

    // SEARCH

    // ========================================================

    if (search) {

      params.push(

        `%${search}%`

      );

      const index =

        params.length;

      conditions.push(`

        (

          e.nama ILIKE $${index}

          OR e.email ILIKE $${index}

          OR e.nik ILIKE $${index}

          OR e.nipy ILIKE $${index}

          OR e.posisi ILIKE $${index}

          OR e.jabatan ILIKE $${index}

          OR e.lokasi ILIKE $${index}

        )

      `);

    }

    // ========================================================

    // STATUS

    // ========================================================

    if (

      status === "AKTIF" ||

      status === "NONAKTIF"

    ) {

      params.push(

        status

      );

      conditions.push(`

        UPPER(

          COALESCE(

            e.status_karyawan,

            'AKTIF'

          )

        ) = $${params.length}

      `);

    }

    // ========================================================

    // POSISI

    // ========================================================

    if (

      posisi &&

      posisi !== "SEMUA"

    ) {

      params.push(

        `%${posisi}%`

      );

      conditions.push(`

        (

          e.posisi ILIKE $${params.length}

          OR e.jabatan ILIKE $${params.length}

        )

      `);

    }

    const where =

      conditions.length

        ? `WHERE ${conditions.join(

            " AND "

          )}`

        : "";

    // ========================================================

    // COUNT

    // ========================================================

    const countResult =

      await db.query(

        `

          SELECT

            COUNT(*)::int AS total

          FROM public.hris_employees e

          ${where}

        `,

        params

      );

    const total =

      Number(

        countResult.rows[0]?.total

      ) || 0;

    // ========================================================

    // DATA

    // ========================================================

    const dataParams = [

      ...params,

      limit,

      offset,

    ];

    const dataResult =

      await db.query(

        `

          ${this.getSelect()}

          ${where}

          ORDER BY

            e.created_at DESC NULLS LAST,

            e.nama ASC

          LIMIT $${dataParams.length - 1}

          OFFSET $${dataParams.length}

        `,

        dataParams

      );

    const data =

      dataResult.rows.map(

        (row: any) =>

          this.mapEmployee(

            row

          )

      );

    // ========================================================

    // SUMMARY

    // ========================================================

    const summaryResult =

      await db.query(`

        SELECT

          COUNT(*)::text

            AS total,

          COUNT(*)

            FILTER (

              WHERE UPPER(

                COALESCE(

                  status_karyawan,

                  'AKTIF'

                )

              ) = 'AKTIF'

            )::text

            AS aktif,

          COUNT(*)

            FILTER (

              WHERE UPPER(

                COALESCE(

                  status_karyawan,

                  'AKTIF'

                )

              ) = 'NONAKTIF'

            )::text

            AS nonaktif,

          COUNT(*)

            FILTER (

              WHERE tanggal_diterima

                IS NOT NULL

            )::text

            AS diterima

        FROM public.hris_employees

      `);

    const summaryRow =

      summaryResult.rows[0] ??

      {};

    const summary = {

      total:

        Number(

          summaryRow.total

        ) || 0,

      aktif:

        Number(

          summaryRow.aktif

        ) || 0,

      nonaktif:

        Number(

          summaryRow.nonaktif

        ) || 0,

      diterima:

        Number(

          summaryRow.diterima

        ) || 0,

    };

    return {

      data,

      meta: {

        page,

        limit,

        total,

        totalPages:

          Math.ceil(

            total / limit

          ),

      },

      summary,

    };

  }

  /* ============================================================

     GET BY ID

  ============================================================ */

  async getById(

    id: string

  ): Promise<Employee> {

    if (

      !validateEmployeeId(

        id

      )

    ) {

      throw new Error(

        "ID employee tidak valid."

      );

    }

    const result =

      await db.query(

        `

          ${this.getSelect()}

          WHERE e.id = $1

          LIMIT 1

        `,

        [id]

      );

    if (

      result.rows.length === 0

    ) {

      throw new Error(

        "Data karyawan tidak ditemukan."

      );

    }

    return this.mapEmployee(

      result.rows[0]

    );

  }

  /* ============================================================

     UPDATE

  ============================================================ */

  async update(

    id: string,

    payload: EmployeeUpdatePayload

  ): Promise<Employee> {

    if (

      !validateEmployeeId(

        id

      )

    ) {

      throw new Error(

        "ID employee tidak valid."

      );

    }

    // ========================================================

    // CEK EXISTING

    // ========================================================

    const existingResult =

      await db.query(

        `

          SELECT

            id,

            nama,

            tmt,

            tst,

            tanggal_masuk,

            lokasi,

            nipy,

            jenis_kepegawaian,

            status_karyawan

          FROM public.hris_employees

          WHERE id = $1

          LIMIT 1

        `,

        [id]

      );

    if (

      existingResult.rows.length === 0

    ) {

      throw new Error(

        "Data karyawan tidak ditemukan."

      );

    }

    // ========================================================

    // DYNAMIC UPDATE

    // ========================================================

    const fields:

      string[] = [];

    const values:

      any[] = [];

    const addField = (

      column: string,

      value: any

    ) => {

      values.push(

        value

      );

      fields.push(

        `${column} = $${values.length}`

      );

    };

    // ========================================================

    // NIPY

    // ========================================================

    if (

      payload.nipy !==

      undefined

    ) {

      addField(

        "nipy",

        normalizeNullableString(

          payload.nipy

        )

      );

    }

    // ========================================================

    // JABATAN

    // ========================================================

    if (

      payload.jabatan !==

      undefined

    ) {

      addField(

        "jabatan",

        normalizeNullableString(

          payload.jabatan

        )

      );

    }

    // ========================================================

    // POSISI

    // ========================================================

    if (

      payload.posisi !==

      undefined

    ) {

      addField(

        "posisi",

        normalizeNullableString(

          payload.posisi

        )

      );

    }

    // ========================================================

    // LOKASI

    // ========================================================

    if (

      payload.lokasi !==

      undefined

    ) {

      addField(

        "lokasi",

        normalizeNullableString(

          payload.lokasi

        )

      );

    }

    // ========================================================

    // TANGGAL MASUK

    // ========================================================

    if (

      payload.tanggalMasuk !==

      undefined

    ) {

      const tanggalMasuk =

        payload.tanggalMasuk ===

          null ||

        payload.tanggalMasuk ===

          ""

          ? null

          : payload.tanggalMasuk;

      if (

        !validateDate(

          tanggalMasuk

        )

      ) {

        throw new Error(

          "Format tanggal masuk harus YYYY-MM-DD."

        );

      }

      addField(

        "tanggal_masuk",

        tanggalMasuk

      );

    }

    // ========================================================

    // JENIS KEPEGAWAIAN

    // ========================================================

    if (

      payload.jenisKepegawaian !==

      undefined

    ) {

      const jenis =

        payload.jenisKepegawaian ===

          null

          ? null

          : payload.jenisKepegawaian;

      if (

        jenis !== null &&

        !validateJenisKepegawaian(

          jenis

        )

      ) {

        throw new Error(

          "Jenis kepegawaian tidak valid."

        );

      }

      addField(

        "jenis_kepegawaian",

        jenis

      );

    }

    // ========================================================

    // TMT

    // ========================================================

    if (

      payload.tmt !==

      undefined

    ) {

      const tmt =

        payload.tmt ===

          null ||

        payload.tmt ===

          ""

          ? null

          : payload.tmt;

      if (

        !validateDate(

          tmt

        )

      ) {

        throw new Error(

          "Format TMT harus YYYY-MM-DD."

        );

      }

      addField(

        "tmt",

        tmt

      );

    }

    // ========================================================

    // TST

    // ========================================================

    if (

      payload.tst !==

      undefined

    ) {

      const tst =

        payload.tst ===

          null ||

        payload.tst ===

          ""

          ? null

          : payload.tst;

      if (

        !validateDate(

          tst

        )

      ) {

        throw new Error(

          "Format TST harus YYYY-MM-DD."

        );

      }

      addField(

        "tst",

        tst

      );

    }

    // ========================================================

    // STATUS KARYAWAN

    // ========================================================

    if (

      payload.statusKaryawan !==

      undefined

    ) {

      if (

        !validateEmployeeStatus(

          payload.statusKaryawan

        )

      ) {

        throw new Error(

          "Status karyawan tidak valid."

        );

      }

      addField(

        "status_karyawan",

        payload.statusKaryawan

      );

    }

    // ========================================================

    // VALIDASI TMT / TST FINAL

    // ========================================================

    const existing =

      existingResult.rows[0];

    const finalTmt =

      payload.tmt !==

      undefined

        ? payload.tmt

        : toDateString(

            existing.tmt

          );

    const finalTst =

      payload.tst !==

      undefined

        ? payload.tst

        : toDateString(

            existing.tst

          );

    if (

      finalTmt &&

      finalTst &&

      finalTst <

        finalTmt

    ) {

      throw new Error(

        "TST tidak boleh lebih awal dari TMT."

      );

    }

    // ========================================================

    // TIDAK ADA FIELD

    // ========================================================

    if (

      fields.length === 0

    ) {

      return this.getById(

        id

      );

    }

    // ========================================================

    // UPDATED AT

    // ========================================================

    fields.push(

      "updated_at = NOW()"

    );

    // ========================================================

    // EXECUTE UPDATE

    // ========================================================

    const result =

      await db.query(

        `

          UPDATE public.hris_employees

          SET

            ${fields.join(

              ",\n            "

            )}

          WHERE id =

            $${values.length + 1}

          RETURNING

            id,

            nama,

            nipy,

            jabatan,

            posisi,

            lokasi,

            tanggal_masuk,

            jenis_kepegawaian,

            tmt,

            tst,

            status_karyawan,

            updated_at

        `,

        [

          ...values,

          id,

        ]

      );

    console.log(

      "[EMPLOYEE DEBUG] HASIL UPDATE:"

    );

    console.table(

      result.rows

    );

    return this.getById(

      id

    );

  }

}

// ============================================================

// EXPORT

// ============================================================

export default new EmployeeRepository();
