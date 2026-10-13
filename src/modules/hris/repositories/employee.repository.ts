
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

function toDateString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;

    // Gunakan tanggal UTC untuk menghindari pergeseran tanggal
    // akibat perbedaan zona waktu server.
    return value.toISOString().slice(0, 10);
  }

  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);

  if (match) return match[1];

  console.warn("[EMPLOYEE DEBUG] Gagal membaca tanggal:", value);

  return null;
}

function normalizeNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();

  return text === "" ? null : text;
}

function validateEmployeeId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

function validateDate(value: string | null | undefined): boolean {
  if (value === null || value === undefined || value === "") {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function validateEmployeeStatus(
  status: string | undefined | null
): status is EmployeeStatus {
  return status === "AKTIF" || status === "NONAKTIF";
}

function validateJenisKepegawaian(
  jenis: string | undefined | null
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
  // ==========================================================
  // ENSURE TABLE
  // ==========================================================

  async ensureTable(): Promise<void> {
    console.log("\n============================================================");
    console.log("[EMPLOYEE DEBUG] ensureTable()");
    console.log("[EMPLOYEE DEBUG] Memeriksa database dan tabel HRIS...");

    // Periksa tabel melalui koneksi yang benar-benar dipakai aplikasi.
    const diagnostic = await db.query(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        inet_server_addr()::text AS server_address,
        inet_server_port() AS server_port,
        current_schema() AS schema_name,
        current_setting('search_path') AS search_path,
        to_regclass('public.hris_employees')::text AS employee_table,
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'hris_employees'
            AND table_type = 'BASE TABLE'
        ) AS table_exists
    `);

    const info = diagnostic.rows[0];

    console.log(
      "[DATABASE DIAGNOSTIC]",
      JSON.stringify(info)
    );

    // Jangan membuat tabel pengganti atau menghapus data.
    if (!info?.table_exists || !info?.employee_table) {
      throw new Error(
        `Tabel public.hris_employees tidak ditemukan pada koneksi aplikasi. ` +
        `Database=${info?.database_name ?? "unknown"}, ` +
        `User=${info?.database_user ?? "unknown"}, ` +
        `Server=${info?.server_address ?? "unknown"}, ` +
        `SearchPath=${info?.search_path ?? "unknown"}. ` +
        "Periksa DATABASE_URL dan service PostgreSQL Railway."
      );
    }

    // Periksa kolom penting sebelum mengubah skema.
    const existingColumns = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'hris_employees'
    `);

    const columnNames = new Set(
      existingColumns.rows.map((row: { column_name: string }) =>
        String(row.column_name)
      )
    );

    console.log(
      "[EMPLOYEE DEBUG] Jumlah kolom ditemukan:",
      columnNames.size
    );

    // Kolom yang digunakan repository untuk SELECT dan UPDATE.
    const requiredColumns = [
      "id",
      "nama",
      "apply_id",
      "lowongan_id",
      "user_id",
      "email",
      "nik",
      "no_hp",
      "tempat_lahir",
      "tanggal_lahir",
      "agama",
      "jenis_kelamin",
      "status_menikah",
      "pendidikan_terakhir",
      "provinsi",
      "kota",
      "kecamatan",
      "alamat",
      "instagram",
      "tiktok",
      "linkedin",
      "twitter",
      "posisi",
      "jabatan",
      "lembaga",
      "lokasi",
      "expected_location",
      "gaji",
      "nipy",
      "jenis_kepegawaian",
      "tmt",
      "tst",
      "tanggal_masuk",
      "status_karyawan",
      "tanggal_diterima",
      "siap_bekerja",
      "cv_file",
      "ijazah_file",
      "transkrip_file",
      "pendukung_file",
      "foto",
      "created_at",
      "updated_at",
    ];

    const missingColumns = requiredColumns.filter(
      (column) => !columnNames.has(column)
    );

    // Tambahkan hanya kolom fitur kepegawaian yang baru.
    // Kolom lama yang hilang tidak dibuat otomatis karena tipe,
    // constraint, dan aturan bisnisnya perlu diverifikasi dahulu.
    await db.query(`
      ALTER TABLE public.hris_employees
        ADD COLUMN IF NOT EXISTS nipy VARCHAR(100),
        ADD COLUMN IF NOT EXISTS jenis_kepegawaian VARCHAR(30),
        ADD COLUMN IF NOT EXISTS tmt DATE,
        ADD COLUMN IF NOT EXISTS tst DATE
    `);

    // Bersihkan nilai jenis kepegawaian yang tidak sesuai enum aplikasi.
    // Tidak menghapus baris karyawan.
    await db.query(`
      UPDATE public.hris_employees
      SET jenis_kepegawaian = NULL
      WHERE jenis_kepegawaian IS NOT NULL
        AND jenis_kepegawaian NOT IN (
          'TETAP',
          'KONTRAK',
          'PARUH_WAKTU'
        )
    `);

    const updatedColumns = await db.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'hris_employees'
    `);

    const updatedColumnNames = new Set(
      updatedColumns.rows.map(
        (row: { column_name: string }) => String(row.column_name)
      )
    );

    const stillMissing = requiredColumns.filter(
      (column) => !updatedColumnNames.has(column)
    );

    console.log(
      "[EMPLOYEE DEBUG] Kolom wajib yang belum tersedia:",
      stillMissing
    );

    if (stillMissing.length > 0) {
      throw new Error(
        "Struktur public.hris_employees belum lengkap. Kolom yang belum tersedia: " +
        stillMissing.join(", ") +
        ". Periksa migration database sebelum menjalankan query HRIS."
      );
    }

    const countResult = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM public.hris_employees
    `);

    console.log(
      "[EMPLOYEE DEBUG] Total data karyawan:",
      countResult.rows[0]?.total ?? 0
    );

    const columnsResult = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'hris_employees'
        AND column_name IN (
          'nipy',
          'jenis_kepegawaian',
          'tmt',
          'tst',
          'tanggal_masuk',
          'tanggal_diterima',
          'status_karyawan'
        )
      ORDER BY ordinal_position
    `);

    console.log("[EMPLOYEE DEBUG] Kolom kepegawaian:");
    console.table(columnsResult.rows);

    console.log(
      "[EMPLOYEE DEBUG] Inisialisasi tabel HRIS berhasil."
    );
    console.log("============================================================\n");
  }

  // ==========================================================
  // SELECT
  // ==========================================================

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

  // ==========================================================
  // MAP EMPLOYEE
  // ==========================================================

  private mapEmployee(row: any): Employee {
    const employee: Employee = {
      id: String(row.id),

      applyId:
        row.apply_id !== null && row.apply_id !== undefined
          ? Number(row.apply_id)
          : null,

      lowonganId:
        row.lowongan_id !== null && row.lowongan_id !== undefined
          ? Number(row.lowongan_id)
          : null,

      userId: row.user_id ?? null,

      nama: row.nama ?? "",
      email: row.email ?? null,
      nik: row.nik ?? null,
      noHp: row.no_hp ?? null,
      tempatLahir: row.tempat_lahir ?? null,
      tanggalLahir: toDateString(row.tanggal_lahir),
      agama: row.agama ?? null,
      jenisKelamin: row.jenis_kelamin ?? null,
      statusMenikah: row.status_menikah ?? null,
      pendidikanTerakhir: row.pendidikan_terakhir ?? null,

      provinsi: row.provinsi ?? null,
      kota: row.kota ?? null,
      kecamatan: row.kecamatan ?? null,
      alamat: row.alamat ?? null,

      instagram: row.instagram ?? null,
      tiktok: row.tiktok ?? null,
      linkedin: row.linkedin ?? null,
      twitter: row.twitter ?? null,

      posisi: row.posisi ?? null,
      lembaga: row.lembaga ?? null,
      lokasi: row.lokasi ?? null,
      expectedLocation: row.expected_location ?? null,
      jabatan: row.jabatan ?? null,
      gaji: row.gaji ?? null,

      siapBekerja: toDateString(row.siap_bekerja),

      nipy: row.nipy ?? null,
      jenisKepegawaian: row.jenis_kepegawaian ?? null,
      tmt: toDateString(row.tmt),
      tst: toDateString(row.tst),
      tanggalMasuk: toDateString(row.tanggal_masuk),

      cvFile: row.cv_file ?? null,
      ijazahFile: row.ijazah_file ?? null,
      transkripFile: row.transkrip_file ?? null,
      pendukungFile: row.pendukung_file ?? null,

      statusKaryawan:
        String(row.status_karyawan ?? "AKTIF").toUpperCase() ===
        "NONAKTIF"
          ? "NONAKTIF"
          : "AKTIF",

      tanggalDiterima: toDateString(row.tanggal_diterima),
      foto: row.foto ?? null,

      createdAt: row.created_at ? String(row.created_at) : null,
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    };

    return employee;
  }

  // ==========================================================
  // GET ALL
  // ==========================================================

  async getAll(query: EmployeeListQuery = {}) {
    const page = Math.max(Number(query.page) || 1, 1);

    const limit = Math.min(
      Math.max(Number(query.limit) || 10, 1),
      1000
    );

    const offset = (page - 1) * limit;

    const search = String(query.search ?? "").trim();

    const status = String(query.status ?? "SEMUA")
      .trim()
      .toUpperCase();

    const posisi = String(query.posisi ?? "SEMUA").trim();

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      const index = params.length;

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

    if (status === "AKTIF" || status === "NONAKTIF") {
      params.push(status);

      conditions.push(`
        UPPER(COALESCE(e.status_karyawan, 'AKTIF')) = $${params.length}
      `);
    }

    if (posisi && posisi !== "SEMUA") {
      params.push(`%${posisi}%`);

      conditions.push(`
        (
          e.posisi ILIKE $${params.length}
          OR e.jabatan ILIKE $${params.length}
        )
      `);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await db.query(
      `
        SELECT COUNT(*)::int AS total
        FROM public.hris_employees e
        ${where}
      `,
      params
    );

    const total = Number(countResult.rows[0]?.total) || 0;

    const dataParams = [...params, limit, offset];

    const dataResult = await db.query(
      `
        ${this.getSelect()}
        ${where}
        ORDER BY e.created_at DESC NULLS LAST, e.nama ASC
        LIMIT $${dataParams.length - 1}
        OFFSET $${dataParams.length}
      `,
      dataParams
    );

    const data = dataResult.rows.map((row: any) =>
      this.mapEmployee(row)
    );

    const summaryResult = await db.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE UPPER(COALESCE(status_karyawan, 'AKTIF')) = 'AKTIF'
        )::int AS aktif,
        COUNT(*) FILTER (
          WHERE UPPER(COALESCE(status_karyawan, 'AKTIF')) = 'NONAKTIF'
        )::int AS nonaktif,
        COUNT(*) FILTER (
          WHERE tanggal_diterima IS NOT NULL
        )::int AS diterima
      FROM public.hris_employees
    `);

    const summaryRow = summaryResult.rows[0] ?? {};

    const summary = {
      total: Number(summaryRow.total) || 0,
      aktif: Number(summaryRow.aktif) || 0,
      nonaktif: Number(summaryRow.nonaktif) || 0,
      diterima: Number(summaryRow.diterima) || 0,
    };

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  // ==========================================================
  // GET BY ID
  // ==========================================================

  async getById(id: string): Promise<Employee> {
    if (!validateEmployeeId(id)) {
      throw new Error("ID employee tidak valid.");
    }

    const result = await db.query(
      `
        ${this.getSelect()}
        WHERE e.id = $1
        LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error("Data karyawan tidak ditemukan.");
    }

    return this.mapEmployee(result.rows[0]);
  }

  // ==========================================================
  // UPDATE
  // ==========================================================

  async update(
    id: string,
    payload: EmployeeUpdatePayload
  ): Promise<Employee> {
    if (!validateEmployeeId(id)) {
      throw new Error("ID employee tidak valid.");
    }

    const existingResult = await db.query(
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

    if (existingResult.rows.length === 0) {
      throw new Error("Data karyawan tidak ditemukan.");
    }

    const fields: string[] = [];
    const values: any[] = [];

    const addField = (column: string, value: any) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (payload.nipy !== undefined) {
      addField("nipy", normalizeNullableString(payload.nipy));
    }

    if (payload.jabatan !== undefined) {
      addField("jabatan", normalizeNullableString(payload.jabatan));
    }

    if (payload.posisi !== undefined) {
      addField("posisi", normalizeNullableString(payload.posisi));
    }

    if (payload.lokasi !== undefined) {
      addField("lokasi", normalizeNullableString(payload.lokasi));
    }

    if (payload.tanggalMasuk !== undefined) {
      const tanggalMasuk =
        payload.tanggalMasuk === null || payload.tanggalMasuk === ""
          ? null
          : payload.tanggalMasuk;

      if (!validateDate(tanggalMasuk)) {
        throw new Error(
          "Format tanggal masuk harus YYYY-MM-DD."
        );
      }

      addField("tanggal_masuk", tanggalMasuk);
    }

    if (payload.jenisKepegawaian !== undefined) {
      const jenis = payload.jenisKepegawaian;

      if (
        jenis !== null &&
        !validateJenisKepegawaian(jenis)
      ) {
        throw new Error("Jenis kepegawaian tidak valid.");
      }

      addField("jenis_kepegawaian", jenis);
    }

    if (payload.tmt !== undefined) {
      const tmt =
        payload.tmt === null || payload.tmt === ""
          ? null
          : payload.tmt;

      if (!validateDate(tmt)) {
        throw new Error("Format TMT harus YYYY-MM-DD.");
      }

      addField("tmt", tmt);
    }

    if (payload.tst !== undefined) {
      const tst =
        payload.tst === null || payload.tst === ""
          ? null
          : payload.tst;

      if (!validateDate(tst)) {
        throw new Error("Format TST harus YYYY-MM-DD.");
      }

      addField("tst", tst);
    }

    if (payload.statusKaryawan !== undefined) {
      if (!validateEmployeeStatus(payload.statusKaryawan)) {
        throw new Error("Status karyawan tidak valid.");
      }

      addField("status_karyawan", payload.statusKaryawan);
    }

    const existing = existingResult.rows[0];

    const finalTmt =
      payload.tmt !== undefined
        ? payload.tmt || null
        : toDateString(existing.tmt);

    const finalTst =
      payload.tst !== undefined
        ? payload.tst || null
        : toDateString(existing.tst);

    if (finalTmt && finalTst && finalTst < finalTmt) {
      throw new Error(
        "TST tidak boleh lebih awal dari TMT."
      );
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    fields.push("updated_at = NOW()");

    const result = await db.query(
      `
        UPDATE public.hris_employees
        SET ${fields.join(", ")}
        WHERE id = $${values.length + 1}
        RETURNING id
      `,
      [...values, id]
    );

    if (result.rows.length === 0) {
      throw new Error("Data karyawan gagal diperbarui.");
    }

    return this.getById(id);
  }
}

export default new EmployeeRepository();
