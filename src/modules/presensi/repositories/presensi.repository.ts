import db from "../../../config/db";

import type {
  Presensi,
  PresensiShift,
  CheckInPayload,
  CheckOutPayload,
} from "../types/presensi.types";

class PresensiRepository {
  // ============================================================
  // BASE SELECT
  // ============================================================
  private readonly BASE_SELECT = `
    SELECT
      p.id,
      p.employee_id,
      e.nama,
      p.tanggal,
      p.shift_id,
      s.nama AS shift_nama,
      TO_CHAR(s.jam_masuk, 'HH24:MI') AS shift_jam_masuk,
      TO_CHAR(s.jam_pulang, 'HH24:MI') AS shift_jam_pulang,
      TO_CHAR(p.jam_masuk, 'HH24:MI') AS jam_masuk,
      TO_CHAR(p.jam_pulang, 'HH24:MI') AS jam_pulang,
      p.lokasi_masuk_lat,
      p.lokasi_masuk_lng,
      p.alamat_masuk,
      p.lokasi_pulang_lat,
      p.lokasi_pulang_lng,
      p.alamat_pulang,
      p.foto_masuk,
      p.foto_pulang,
      p.metode_masuk,
      p.metode_pulang,
      p.face_verified_masuk,
      p.face_verified_pulang,
      p.face_similarity_masuk,
      p.face_similarity_pulang,
      p.status,
      p.menit_terlambat,
      p.menit_pulang_cepat,
      TO_CHAR(p.lembur_mulai, 'HH24:MI') AS lembur_mulai,
      TO_CHAR(p.lembur_selesai, 'HH24:MI') AS lembur_selesai,
      p.menit_lembur,
      p.catatan,
      p.created_at,
      p.updated_at
    FROM presensi_records p
    INNER JOIN hris_employees e ON e.id = p.employee_id
    LEFT JOIN presensi_shifts s ON s.id = p.shift_id
  `;

  private mapRow(row: any): Presensi {
    return {
      id: String(row.id),
      employeeId: String(row.employee_id),
      nama: row.nama,
      tanggal: row.tanggal,
      shiftId: row.shift_id ? String(row.shift_id) : null,
      shiftNama: row.shift_nama ?? null,
      shiftJamMasuk: row.shift_jam_masuk ?? null,
      shiftJamPulang: row.shift_jam_pulang ?? null,
      jamMasuk: row.jam_masuk ?? null,
      jamPulang: row.jam_pulang ?? null,
      lokasiMasukLat:
        row.lokasi_masuk_lat !== null ? Number(row.lokasi_masuk_lat) : null,
      lokasiMasukLng:
        row.lokasi_masuk_lng !== null ? Number(row.lokasi_masuk_lng) : null,
      alamatMasuk: row.alamat_masuk ?? null,
      lokasiPulangLat:
        row.lokasi_pulang_lat !== null ? Number(row.lokasi_pulang_lat) : null,
      lokasiPulangLng:
        row.lokasi_pulang_lng !== null ? Number(row.lokasi_pulang_lng) : null,
      alamatPulang: row.alamat_pulang ?? null,
      fotoMasuk: row.foto_masuk ?? null,
      fotoPulang: row.foto_pulang ?? null,
      metodeMasuk: row.metode_masuk ?? null,
      metodePulang: row.metode_pulang ?? null,
      faceVerifiedMasuk: Boolean(row.face_verified_masuk),
      faceVerifiedPulang: Boolean(row.face_verified_pulang),
      faceSimilarityMasuk:
        row.face_similarity_masuk !== null
          ? Number(row.face_similarity_masuk)
          : null,
      faceSimilarityPulang:
        row.face_similarity_pulang !== null
          ? Number(row.face_similarity_pulang)
          : null,
      status: row.status,
      menitTerlambat: Number(row.menit_terlambat ?? 0),
      menitPulangCepat: Number(row.menit_pulang_cepat ?? 0),
      lemburMulai: row.lembur_mulai ?? null,
      lemburSelesai: row.lembur_selesai ?? null,
      menitLembur: Number(row.menit_lembur ?? 0),
      catatan: row.catatan ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================================
  // EMPLOYEE / LOOKUP
  // ============================================================
  async getActiveEmployeeByUserUuid(userUuid: string) {
    const result = await db.query(
      `
        SELECT e.id, e.nama, e.user_id, e.status_karyawan
        FROM hris_employees e
        WHERE e.user_id = $1
          AND UPPER(TRIM(COALESCE(e.status_karyawan, ''))) = 'AKTIF'
        LIMIT 1
      `,
      [userUuid]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: String(row.id),
      nama: row.nama,
      userId: row.user_id ? String(row.user_id) : null,
      statusKaryawan: row.status_karyawan ?? null,
    };
  }

  async getTodayShift(
    employeeId: string,
    tanggal: string
  ): Promise<PresensiShift | null> {
    const result = await db.query(
      `
        SELECT
          s.id, s.nama, s.kode,
          TO_CHAR(s.jam_masuk, 'HH24:MI') AS jam_masuk,
          TO_CHAR(s.jam_pulang, 'HH24:MI') AS jam_pulang,
          s.toleransi_menit,
          s.absen_mulai_menit,
          s.lintas_hari, s.status
        FROM presensi_shift_assignments a
        INNER JOIN presensi_shifts s ON s.id = a.shift_id
        WHERE a.employee_id = $1
          AND a.status = 'AKTIF'
          AND s.status = 'AKTIF'
          AND a.tanggal_mulai <= $2::date
          AND (a.tanggal_selesai IS NULL OR a.tanggal_selesai >= $2::date)
        ORDER BY a.tanggal_mulai DESC
        LIMIT 1
      `,
      [employeeId, tanggal]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: String(row.id),
      nama: row.nama,
      kode: row.kode ?? null,
      jamMasuk: row.jam_masuk,
      jamPulang: row.jam_pulang,
      toleransiMenit: Number(row.toleransi_menit ?? 0),
      absenMulaiMenit: Number(row.absen_mulai_menit ?? 60),
      lintasHari: Boolean(row.lintas_hari),
      status: row.status,
    };
  }

  // ============================================================
  // READ
  // ============================================================
  async getByEmployeeDate(
    employeeId: string,
    tanggal: string
  ): Promise<Presensi | null> {
    const result = await db.query(
      `
        ${this.BASE_SELECT}
        WHERE p.employee_id = $1 AND p.tanggal = $2
        LIMIT 1
      `,
      [employeeId, tanggal]
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async getById(id: string): Promise<Presensi | null> {
    const result = await db.query(
      `
        ${this.BASE_SELECT}
        WHERE p.id = $1
        LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  // ============================================================
  // WRITE
  // ============================================================
  async checkIn(
    employeeId: string,
    tanggal: string,
    payload: CheckInPayload,
    shiftId: string | null,
    status: "HADIR" | "TERLAMBAT",
    menitTerlambat: number
  ): Promise<Presensi> {
    const result = await db.query(
      `
        INSERT INTO presensi_records (
          employee_id, tanggal, shift_id, jam_masuk,
          lokasi_masuk_lat, lokasi_masuk_lng, alamat_masuk,
          foto_masuk, metode_masuk,
          face_verified_masuk, face_similarity_masuk,
          status, menit_terlambat, catatan,
          created_at, updated_at
        )
        VALUES (
          $1, $2, $3, NOW(),
          $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, NOW(), NOW()
        )
        RETURNING id
      `,
      [
        employeeId,
        tanggal,
        shiftId,
        payload.latitude ?? null,
        payload.longitude ?? null,
        payload.alamat ?? null,
        payload.foto ?? null,
        payload.metode ?? null,
        payload.faceVerified ?? false,
        payload.faceSimilarity ?? null,
        status,
        menitTerlambat,
        payload.catatan ?? null,
      ]
    );

    const created = await this.getById(result.rows[0].id);
    if (!created) throw new Error("Data presensi masuk gagal dibaca kembali.");
    return created;
  }

  // ============================================================
  // CHECK OUT — FIX 42804 (time → timestamp)
  // ============================================================
  async checkOut(
    presensiId: string,
    payload: CheckOutPayload,
    menitPulangCepat: number,
    overtime: {
      mulai: string | null;
      selesai: string | null;
      menit: number;
    }
  ): Promise<Presensi> {
    const result = await db.query(
      `
        UPDATE presensi_records
        SET
          jam_pulang = NOW(),
          lokasi_pulang_lat = $1,
          lokasi_pulang_lng = $2,
          alamat_pulang = $3,
          foto_pulang = $4,
          metode_pulang = $5,
          face_verified_pulang = $6,
          face_similarity_pulang = $7,
          menit_pulang_cepat = $8,

          -- FIX: kolom bertipe timestamp → gabungkan tanggal + jam
          lembur_mulai   = CASE
            WHEN $9::text IS NULL THEN NULL
            ELSE (tanggal::date + $9::time)::timestamp
          END,
          lembur_selesai = CASE
            WHEN $10::text IS NULL THEN NULL
            ELSE (tanggal::date + $10::time)::timestamp
          END,

          menit_lembur = $11,
          catatan = COALESCE($12, catatan),
          updated_at = NOW()
        WHERE id = $13
        RETURNING id
      `,
      [
        payload.latitude ?? null,
        payload.longitude ?? null,
        payload.alamat ?? null,
        payload.foto ?? null,
        payload.metode ?? null,
        payload.faceVerified ?? false,
        payload.faceSimilarity ?? null,
        menitPulangCepat,
        overtime.mulai,        // "HH:MM" atau null
        overtime.selesai,      // "HH:MM" atau null
        overtime.menit,
        payload.catatan ?? null,
        presensiId,
      ]
    );

    if (result.rows.length === 0) {
      throw new Error("Data presensi tidak ditemukan.");
    }

    const updated = await this.getById(presensiId);
    if (!updated) throw new Error("Data presensi pulang gagal dibaca kembali.");
    return updated;
  }

  // ============================================================
  // HISTORY USER
  // ============================================================
  async getMyHistory(
    userUuid: string,
    startDate: string,
    endDate: string
  ): Promise<Presensi[]> {
    const employee = await this.getActiveEmployeeByUserUuid(userUuid);
    if (!employee) return [];

    const result = await db.query(
      `
        ${this.BASE_SELECT}
        WHERE p.employee_id = $1
          AND p.tanggal >= $2::date
          AND p.tanggal <= $3::date
        ORDER BY p.tanggal DESC, p.jam_masuk DESC NULLS LAST
      `,
      [employee.id, startDate, endDate]
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  // ============================================================
  // SHIFTS
  // ============================================================
  async getShifts(): Promise<PresensiShift[]> {
    const result = await db.query(
      `
        SELECT
          id, nama, kode,
          TO_CHAR(jam_masuk, 'HH24:MI') AS jam_masuk,
          TO_CHAR(jam_pulang, 'HH24:MI') AS jam_pulang,
          toleransi_menit, absen_mulai_menit,
          lintas_hari, status
        FROM presensi_shifts
        WHERE status = 'AKTIF'
        ORDER BY jam_masuk ASC, nama ASC
      `
    );

    return result.rows.map((row) => ({
      id: String(row.id),
      nama: row.nama,
      kode: row.kode ?? null,
      jamMasuk: row.jam_masuk,
      jamPulang: row.jam_pulang,
      toleransiMenit: Number(row.toleransi_menit ?? 0),
      absenMulaiMenit: Number(row.absen_mulai_menit ?? 60),
      lintasHari: Boolean(row.lintas_hari),
      status: row.status,
    }));
  }

  // ============================================================
  // REKAP RANGE
  // ============================================================
  async getRekap(filters: {
    startDate: string;
    endDate: string;
    employeeId?: string;
    shiftId?: string;
    status?: string;
  }) {
    const conditions: string[] = [
      `p.tanggal >= $1::date`,
      `p.tanggal <= $2::date`,
    ];
    const params: any[] = [filters.startDate, filters.endDate];

    if (filters.employeeId) {
      params.push(filters.employeeId);
      conditions.push(`p.employee_id = $${params.length}`);
    }
    if (filters.shiftId) {
      params.push(filters.shiftId);
      conditions.push(`p.shift_id = $${params.length}`);
    }
    if (filters.status && filters.status !== "ALL") {
      params.push(filters.status);
      conditions.push(`p.status = $${params.length}`);
    }

    const result = await db.query(
      `
        SELECT
          p.id, p.employee_id, e.nama, e.nik, p.tanggal,
          EXTRACT(DOW FROM p.tanggal)::INTEGER AS dow,
          p.shift_id, s.nama AS shift_nama,
          TO_CHAR(p.jam_masuk, 'HH24:MI') AS jam_masuk,
          TO_CHAR(p.jam_pulang, 'HH24:MI') AS jam_pulang,
          p.status,
          p.menit_terlambat, p.menit_pulang_cepat, p.menit_lembur,
          p.metode_masuk, p.metode_pulang,
          p.catatan
        FROM presensi_records p
        INNER JOIN hris_employees e ON e.id = p.employee_id
        LEFT JOIN presensi_shifts s ON s.id = p.shift_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.tanggal DESC, e.nama ASC
      `,
      params
    );
    return result.rows;
  }

  // ============================================================
  // CUTI
  // ============================================================
  async getApprovedLeavesInRange(startDate: string, endDate: string) {
    const result = await db.query(
      `
        SELECT
          lr.id, lr.employee_id,
          lt.name AS leave_type_name,
          lr.start_date, lr.end_date, lr.total_days
        FROM leave_requests lr
        INNER JOIN leave_types lt ON lt.id = lr.leave_type_id
        WHERE lr.status = 'APPROVED'
          AND lr.start_date <= $2::date
          AND lr.end_date >= $1::date
      `,
      [startDate, endDate]
    );
    return result.rows;
  }

  // ============================================================
  // REKAP BULANAN
  // ============================================================
  async getRekapBulanan(
    month: number,
    year: number,
    employeeIds?: string[]
  ) {
    const empConditions: string[] = [`status_karyawan = 'AKTIF'`];
    const empParams: any[] = [];

    if (employeeIds && employeeIds.length > 0) {
      empParams.push(employeeIds);
      empConditions.push(`id = ANY($${empParams.length}::uuid[])`);
    }

    const empResult = await db.query(
      `
        SELECT id, nama, nik, jabatan, posisi, status_karyawan
        FROM hris_employees
        WHERE ${empConditions.join(" AND ")}
        ORDER BY nama ASC
      `,
      empParams
    );

    const employees = empResult.rows;
    if (employees.length === 0) {
      return {
        employees: [],
        presensi: [],
        leaves: [],
        shiftAssignments: [],
        startDate: null,
        endDate: null,
        lastDay: 0,
      };
    }

    const mm = String(month).padStart(2, "0");
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${mm}-01`;
    const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

    const empIds = employees.map((e: any) => e.id);

    // PRESENSI
    const presensiResult = await db.query(
      `
        SELECT
          p.id,
          p.employee_id,
          TO_CHAR(p.tanggal, 'YYYY-MM-DD') AS tanggal,
          p.shift_id,
          s.nama AS shift_nama,
          TO_CHAR(p.jam_masuk, 'HH24:MI') AS jam_masuk,
          TO_CHAR(p.jam_pulang, 'HH24:MI') AS jam_pulang,
          TO_CHAR(p.lembur_mulai, 'HH24:MI') AS lembur_mulai,
          TO_CHAR(p.lembur_selesai, 'HH24:MI') AS lembur_selesai,
          p.status,
          p.metode_masuk,
          p.metode_pulang,
          p.menit_terlambat,
          p.menit_pulang_cepat,
          p.menit_lembur,
          p.catatan,
          TO_CHAR(s.jam_masuk, 'HH24:MI') AS shift_jam_masuk,
          TO_CHAR(s.jam_pulang, 'HH24:MI') AS shift_jam_pulang
        FROM presensi_records p
        LEFT JOIN presensi_shifts s ON s.id = p.shift_id
        WHERE p.employee_id = ANY($1::uuid[])
          AND p.tanggal >= $2::date
          AND p.tanggal <= $3::date
        ORDER BY p.employee_id ASC, p.tanggal ASC
      `,
      [empIds, startDate, endDate]
    );

    // SHIFT ASSIGNMENTS (expand per-hari)
    const shiftResult = await db.query(
      `
        SELECT
          a.employee_id,
          TO_CHAR(d.tanggal, 'YYYY-MM-DD') AS tanggal,
          a.shift_id,
          s.nama AS shift_nama,
          TO_CHAR(s.jam_masuk, 'HH24:MI') AS shift_jam_masuk,
          TO_CHAR(s.jam_pulang, 'HH24:MI') AS shift_jam_pulang
        FROM presensi_shift_assignments a
        INNER JOIN presensi_shifts s ON s.id = a.shift_id
        CROSS JOIN LATERAL generate_series(
          a.tanggal_mulai,
          COALESCE(a.tanggal_selesai, $3::date),
          '1 day'::interval
        ) AS d(tanggal)
        WHERE a.employee_id = ANY($1::uuid[])
          AND a.status = 'AKTIF'
          AND a.tanggal_mulai <= $3::date
          AND COALESCE(a.tanggal_selesai, $3::date) >= $2::date
        ORDER BY a.employee_id ASC, d.tanggal ASC
      `,
      [empIds, startDate, endDate]
    );

    // LEAVES
    const leaveResult = await db.query(
      `
        SELECT
          lr.employee_id,
          lr.start_date,
          lr.end_date,
          lt.name AS leave_type_name
        FROM leave_requests lr
        INNER JOIN leave_types lt ON lt.id = lr.leave_type_id
        WHERE lr.employee_id = ANY($1::uuid[])
          AND lr.status = 'APPROVED'
          AND lr.start_date <= $3::date
          AND lr.end_date >= $2::date
      `,
      [empIds, startDate, endDate]
    );

    return {
      employees,
      presensi: presensiResult.rows,
      leaves: leaveResult.rows,
      shiftAssignments: shiftResult.rows,
      startDate,
      endDate,
      lastDay,
    };
  }
}

export default new PresensiRepository();