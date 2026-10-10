import db from "../../../config/db";

import {
  CreateLeaveRequestPayload,
  CreateLeaveTypePayload,
  UpdateLeaveBalancePayload,
  UpdateLeaveStatusPayload,
  UpdateLeaveTypePayload,
} from "../types/cuti.types";

// ============================================================
// HELPER: hitung total hari kerja (tanpa Sabtu/Minggu)
// ============================================================
function calculateWorkingDays(
  startDate: string,
  endDate: string
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Tanggal tidak valid.");
  }
  if (end < start) {
    throw new Error(
      "Tanggal selesai tidak boleh lebih awal dari tanggal mulai."
    );
  }

  let total = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) total++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

class CutiRepository {
  // ============================================================
  // MASTER JENIS CUTI
  // ============================================================
  async getLeaveTypes() {
    const result = await db.query(`
      SELECT
        id, code, name, description, default_days,
        requires_attachment, is_paid, is_active,
        created_at, updated_at
      FROM leave_types
      ORDER BY name ASC
    `);
    return result.rows;
  }

  async createLeaveType(payload: CreateLeaveTypePayload) {
    const result = await db.query(
      `
        INSERT INTO leave_types (
          code, name, description, default_days,
          requires_attachment, is_paid, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id, code, name, description, default_days,
          requires_attachment, is_paid, is_active,
          created_at, updated_at
      `,
      [
        payload.code,
        payload.name,
        payload.description ?? null,
        payload.default_days ?? 0,
        payload.requires_attachment ?? false,
        payload.is_paid ?? true,
        payload.is_active ?? true,
      ]
    );
    return result.rows[0];
  }

  async updateLeaveType(id: string, payload: UpdateLeaveTypePayload) {
    const result = await db.query(
      `
        UPDATE leave_types
        SET
          code = COALESCE($1, code),
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          default_days = COALESCE($4, default_days),
          requires_attachment = COALESCE($5, requires_attachment),
          is_paid = COALESCE($6, is_paid),
          is_active = COALESCE($7, is_active),
          updated_at = NOW()
        WHERE id = $8
        RETURNING
          id, code, name, description, default_days,
          requires_attachment, is_paid, is_active,
          created_at, updated_at
      `,
      [
        payload.code ?? null,
        payload.name ?? null,
        payload.description ?? null,
        payload.default_days ?? null,
        payload.requires_attachment ?? null,
        payload.is_paid ?? null,
        payload.is_active ?? null,
        id,
      ]
    );
    return result.rows[0] ?? null;
  }

  async deleteLeaveType(id: string) {
    const result = await db.query(
      `
        UPDATE leave_types
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );
    return result.rows[0] ?? null;
  }

  // ============================================================
  // EMPLOYEE
  // ============================================================
  async getEmployees() {
    const result = await db.query(`
      SELECT id, nama, nik, jabatan, posisi, status_karyawan
      FROM hris_employees
      WHERE status_karyawan = 'AKTIF'
      ORDER BY nama ASC
    `);
    return result.rows;
  }

  // ============================================================
  // BALANCE
  // ============================================================
  async getBalances(year: number) {
    const result = await db.query(
      `
        SELECT
          e.id AS employee_id,
          e.nama AS employee_name,
          e.nik,
          e.jabatan,
          lt.id AS leave_type_id,
          lt.code AS leave_type_code,
          lt.name AS leave_type_name,
          COALESCE(lb.allocated_days, lt.default_days)::INTEGER AS allocated_days,
          COALESCE(used.used_days, 0)::INTEGER AS used_days,
          (
            COALESCE(lb.allocated_days, lt.default_days)
            - COALESCE(used.used_days, 0)
          )::INTEGER AS remaining_days,
          $1::INTEGER AS year,
          lb.notes
        FROM hris_employees e
        CROSS JOIN leave_types lt
        LEFT JOIN leave_balances lb
          ON lb.employee_id = e.id
          AND lb.leave_type_id = lt.id
          AND lb.year = $1
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(SUM(lr.total_days), 0)::INTEGER AS used_days
          FROM leave_requests lr
          WHERE lr.employee_id = e.id
            AND lr.leave_type_id = lt.id
            AND lr.status = 'APPROVED'
            AND EXTRACT(YEAR FROM lr.start_date) = $1
        ) used ON TRUE
        WHERE e.status_karyawan = 'AKTIF'
          AND lt.is_active = TRUE
        ORDER BY e.nama ASC, lt.name ASC
      `,
      [year]
    );
    return result.rows;
  }

  async upsertBalance(payload: UpdateLeaveBalancePayload) {
    const result = await db.query(
      `
        INSERT INTO leave_balances (
          employee_id, leave_type_id, year, allocated_days, notes
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (employee_id, leave_type_id, year)
        DO UPDATE SET
          allocated_days = EXCLUDED.allocated_days,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING
          id, employee_id, leave_type_id, year,
          allocated_days, notes, created_at, updated_at
      `,
      [
        payload.employee_id,
        payload.leave_type_id,
        payload.year,
        payload.allocated_days,
        payload.notes ?? null,
      ]
    );
    return result.rows[0];
  }

  // ============================================================
  // REQUEST CUTI
  // ============================================================
  async getRequests(params: { status?: string; year?: number }) {
    const status =
      params.status && params.status !== "ALL" ? params.status : null;
    const year = params.year || new Date().getFullYear();

    const result = await db.query(
      `
        SELECT
          lr.id, lr.employee_id,
          e.nama AS employee_name, e.nik, e.jabatan,
          lr.leave_type_id,
          lt.code AS leave_type_code,
          lt.name AS leave_type_name,
          lr.start_date, lr.end_date, lr.total_days,
          lr.reason, lr.attachment, lr.status,
          lr.approved_by,
          u.name AS approved_by_name,
          lr.approved_at, lr.rejection_reason,
          lr.created_at, lr.updated_at
        FROM leave_requests lr
        INNER JOIN hris_employees e ON e.id = lr.employee_id
        INNER JOIN leave_types lt ON lt.id = lr.leave_type_id
        LEFT JOIN users u ON u.id = lr.approved_by
        WHERE EXTRACT(YEAR FROM lr.start_date) = $1
          AND ($2::VARCHAR IS NULL OR lr.status = $2)
        ORDER BY lr.start_date DESC, lr.created_at DESC
      `,
      [year, status]
    );
    return result.rows;
  }

  async createRequest(payload: CreateLeaveRequestPayload) {
    const totalDays = calculateWorkingDays(
      payload.start_date,
      payload.end_date
    );

    if (totalDays <= 0) {
      throw new Error("Rentang tanggal tidak mengandung hari kerja.");
    }

    // Cek overlap
    const overlap = await db.query(
      `
        SELECT id
        FROM leave_requests
        WHERE employee_id = $1
          AND status IN ('PENDING', 'APPROVED')
          AND start_date <= $3
          AND end_date >= $2
        LIMIT 1
      `,
      [payload.employee_id, payload.start_date, payload.end_date]
    );

    if (overlap.rows.length > 0) {
      throw new Error(
        "Karyawan sudah memiliki pengajuan cuti pada tanggal tersebut."
      );
    }

    const result = await db.query(
      `
        INSERT INTO leave_requests (
          employee_id, leave_type_id, start_date, end_date,
          total_days, reason, attachment, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
        RETURNING
          id, employee_id, leave_type_id, start_date, end_date,
          total_days, reason, attachment, status,
          created_at, updated_at
      `,
      [
        payload.employee_id,
        payload.leave_type_id,
        payload.start_date,
        payload.end_date,
        totalDays,
        payload.reason ?? null,
        payload.attachment ?? null,
      ]
    );
    return result.rows[0];
  }

  // ============================================================
  // UPDATE STATUS
  // ============================================================
  async updateStatus(
    id: string,
    payload: UpdateLeaveStatusPayload,
    approvedBy: number
  ) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const requestResult = await client.query(
        `
          SELECT
            lr.id, lr.employee_id, lr.leave_type_id,
            lr.start_date, lr.end_date, lr.total_days, lr.status,
            EXTRACT(YEAR FROM lr.start_date)::INTEGER AS year
          FROM leave_requests lr
          WHERE lr.id = $1
          FOR UPDATE
        `,
        [id]
      );

      const request = requestResult.rows[0];
      if (!request) {
        await client.query("ROLLBACK");
        return null;
      }

      if (payload.status === "APPROVED") {
        if (request.status !== "PENDING") {
          throw new Error(
            "Hanya cuti dengan status PENDING yang dapat disetujui."
          );
        }

        const balanceResult = await client.query(
          `
            SELECT
              COALESCE(lb.allocated_days, lt.default_days)::INTEGER AS allocated_days
            FROM leave_types lt
            LEFT JOIN leave_balances lb
              ON lb.leave_type_id = lt.id
              AND lb.employee_id = $1
              AND lb.year = $3
            WHERE lt.id = $2
              AND lt.is_active = TRUE
          `,
          [request.employee_id, request.leave_type_id, request.year]
        );

        const balance = balanceResult.rows[0];
        if (!balance) {
          throw new Error(
            "Jenis cuti tidak ditemukan atau sudah tidak aktif."
          );
        }

        const usedResult = await client.query(
          `
            SELECT
              COALESCE(SUM(total_days), 0)::INTEGER AS used_days
            FROM leave_requests
            WHERE employee_id = $1
              AND leave_type_id = $2
              AND status = 'APPROVED'
              AND EXTRACT(YEAR FROM start_date) = $3
              AND id <> $4
          `,
          [request.employee_id, request.leave_type_id, request.year, id]
        );

        const usedDays = Number(usedResult.rows[0]?.used_days || 0);
        const allocatedDays = Number(balance.allocated_days || 0);
        const remainingDays = allocatedDays - usedDays;

        if (request.total_days > remainingDays) {
          throw new Error(
            `Jatah cuti tidak mencukupi. Sisa cuti hanya ${remainingDays} hari.`
          );
        }
      }

      if (payload.status === "CANCELLED") {
        if (
          request.status !== "PENDING" &&
          request.status !== "APPROVED"
        ) {
          throw new Error(
            "Hanya cuti PENDING atau APPROVED yang dapat dibatalkan."
          );
        }
      }

      const result = await client.query(
        `
          UPDATE leave_requests
          SET
            status = $1,
            approved_by = CASE
              WHEN $1 = 'APPROVED' THEN $2
              ELSE approved_by
            END,
            approved_at = CASE
              WHEN $1 = 'APPROVED' THEN NOW()
              ELSE approved_at
            END,
            rejection_reason = CASE
              WHEN $1 = 'REJECTED' THEN $3
              ELSE NULL
            END,
            updated_at = NOW()
          WHERE id = $4
          RETURNING
            id, employee_id, leave_type_id, start_date, end_date,
            total_days, reason, attachment, status,
            approved_by, approved_at, rejection_reason,
            created_at, updated_at
        `,
        [
          payload.status,
          approvedBy,
          payload.rejection_reason ?? null,
          id,
        ]
      );

      await client.query("COMMIT");
      return result.rows[0] ?? null;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new CutiRepository();