import db from "../../../config/db";

class ShiftRepository {
  // ============================================================
  // QUERY
  // ============================================================
  async getAll() {
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
    return result.rows.map(this.mapShift);
  }

  async getAllAdmin() {
    const result = await db.query(
      `
        SELECT
          id, nama, kode,
          TO_CHAR(jam_masuk, 'HH24:MI') AS jam_masuk,
          TO_CHAR(jam_pulang, 'HH24:MI') AS jam_pulang,
          toleransi_menit, absen_mulai_menit,
          lintas_hari, status
        FROM presensi_shifts
        ORDER BY nama ASC
      `
    );
    return result.rows.map(this.mapShift);
  }

  private mapShift(row: any) {
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
  // CRUD SHIFT
  // ============================================================
  async create(payload: {
    nama: string;
    kode?: string | null;
    jam_masuk: string;
    jam_pulang: string;
    toleransi_menit: number;
    absen_mulai_menit: number;
    lintas_hari: boolean;
    status: string;
  }) {
    const result = await db.query(
      `
        INSERT INTO presensi_shifts (
          nama, kode, jam_masuk, jam_pulang,
          toleransi_menit, absen_mulai_menit,
          lintas_hari, status,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `,
      [
        payload.nama,
        payload.kode ?? null,
        payload.jam_masuk,
        payload.jam_pulang,
        payload.toleransi_menit,
        payload.absen_mulai_menit,
        payload.lintas_hari,
        payload.status,
      ]
    );
    return result.rows[0];
  }

  async update(id: string, payload: any) {
    const result = await db.query(
      `
        UPDATE presensi_shifts
        SET
          nama = COALESCE($1, nama),
          kode = COALESCE($2, kode),
          jam_masuk = COALESCE($3, jam_masuk),
          jam_pulang = COALESCE($4, jam_pulang),
          toleransi_menit = COALESCE($5, toleransi_menit),
          absen_mulai_menit = COALESCE($6, absen_mulai_menit),
          lintas_hari = COALESCE($7, lintas_hari),
          status = COALESCE($8, status),
          updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `,
      [
        payload.nama ?? null,
        payload.kode ?? null,
        payload.jam_masuk ?? null,
        payload.jam_pulang ?? null,
        payload.toleransi_menit ?? null,
        payload.absen_mulai_menit ?? null,
        payload.lintas_hari ?? null,
        payload.status ?? null,
        id,
      ]
    );
    return result.rows[0] ?? null;
  }

  async remove(id: string) {
    const result = await db.query(
      `
        UPDATE presensi_shifts
        SET status = 'NONAKTIF', updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ============================================================
  // ASSIGNMENT — CREATE
  // ============================================================
  async assign(
    employeeId: string,
    shiftId: string,
    tanggalMulai: string,
    tanggalSelesai: string | null
  ) {
    const result = await db.query(
      `
        INSERT INTO presensi_shift_assignments (
          employee_id, shift_id, tanggal_mulai, tanggal_selesai,
          status, created_at, updated_at
        )
        VALUES ($1, $2, $3::date, $4::date, 'AKTIF', NOW(), NOW())
        RETURNING *
      `,
      [employeeId, shiftId, tanggalMulai, tanggalSelesai]
    );
    return result.rows[0];
  }

  // ============================================================
  // ASSIGNMENT — LIST
  // ============================================================
  async getAssignments(filters: {
    employeeId?: string;
    shiftId?: string;
    activeOnly?: boolean;
  }) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.employeeId) {
      params.push(filters.employeeId);
      conditions.push(`a.employee_id = $${params.length}`);
    }
    if (filters.shiftId) {
      params.push(filters.shiftId);
      conditions.push(`a.shift_id = $${params.length}`);
    }
    if (filters.activeOnly) {
      conditions.push(`a.status = 'AKTIF'`);
    }

    const where = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";

    const result = await db.query(
      `
        SELECT
          a.id, a.employee_id, a.shift_id,
          a.tanggal_mulai, a.tanggal_selesai,
          a.status, a.created_at, a.updated_at,
          e.nama AS employee_nama,
          s.nama AS shift_nama
        FROM presensi_shift_assignments a
        INNER JOIN hris_employees e ON e.id = a.employee_id
        INNER JOIN presensi_shifts s ON s.id = a.shift_id
        ${where}
        ORDER BY a.tanggal_mulai DESC, e.nama ASC
      `,
      params
    );

    return result.rows.map((row: any) => ({
      id: String(row.id),
      employeeId: String(row.employee_id),
      employeeNama: row.employee_nama,
      shiftId: String(row.shift_id),
      shiftNama: row.shift_nama,
      tanggalMulai: row.tanggal_mulai,
      tanggalSelesai: row.tanggal_selesai,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // ============================================================
  // ASSIGNMENT — UPDATE STATUS ONLY
  // ============================================================
  async updateAssignmentStatus(id: string, status: string) {
    const result = await db.query(
      `
        UPDATE presensi_shift_assignments
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `,
      [status, id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ============================================================
  // ASSIGNMENT — UPDATE FULL
  // ============================================================
  async updateAssignment(
    id: string,
    payload: {
      employee_id?: string;
      shift_id?: string;
      tanggal_mulai?: string;
      tanggal_selesai?: string | null;
      status?: string;
    }
  ) {
    const result = await db.query(
      `
        UPDATE presensi_shift_assignments
        SET
          employee_id = COALESCE($1, employee_id),
          shift_id = COALESCE($2, shift_id),
          tanggal_mulai = COALESCE($3::date, tanggal_mulai),
          tanggal_selesai = $4::date,
          status = COALESCE($5, status),
          updated_at = NOW()
        WHERE id = $6
        RETURNING *
      `,
      [
        payload.employee_id ?? null,
        payload.shift_id ?? null,
        payload.tanggal_mulai ?? null,
        payload.tanggal_selesai ?? null,
        payload.status ?? null,
        id,
      ]
    );

    return result.rows[0] ?? null;
  }
}

export default new ShiftRepository();