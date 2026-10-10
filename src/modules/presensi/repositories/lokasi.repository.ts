import db from "../../../config/db";
import type { PresensiLocation } from "../types/presensi.types";

function mapRow(row: any): PresensiLocation {
  return {
    id: String(row.id),
    nama: row.nama,
    alamat: row.alamat ?? null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radius_meter: Number(row.radius_meter),
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

class LokasiRepository {
  // ==========================================================
  // AMBIL SEMUA LOKASI
  // ==========================================================
  async getAll(onlyActive = false): Promise<PresensiLocation[]> {
    const result = await db.query(
      `
        SELECT
          id, nama, alamat, latitude, longitude,
          radius_meter, is_active, created_at, updated_at
        FROM presensi_locations
        ${onlyActive ? "WHERE is_active = TRUE" : ""}
        ORDER BY nama ASC
      `
    );
    return result.rows.map(mapRow);
  }

  // ==========================================================
  // AMBIL 1 LOKASI
  // ==========================================================
  async getById(id: string): Promise<PresensiLocation | null> {
    const result = await db.query(
      `
        SELECT
          id, nama, alamat, latitude, longitude,
          radius_meter, is_active, created_at, updated_at
        FROM presensi_locations
        WHERE id = $1
      `,
      [id]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  // ==========================================================
  // BUAT LOKASI
  // ==========================================================
  async create(payload: {
    nama: string;
    alamat?: string | null;
    latitude: number;
    longitude: number;
    radius_meter: number;
    is_active?: boolean;
  }): Promise<PresensiLocation> {
    const result = await db.query(
      `
        INSERT INTO presensi_locations (
          nama, alamat, latitude, longitude,
          radius_meter, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id, nama, alamat, latitude, longitude,
          radius_meter, is_active, created_at, updated_at
      `,
      [
        payload.nama,
        payload.alamat ?? null,
        payload.latitude,
        payload.longitude,
        payload.radius_meter,
        payload.is_active ?? true,
      ]
    );
    return mapRow(result.rows[0]);
  }

  // ==========================================================
  // UPDATE LOKASI
  // ==========================================================
  async update(
    id: string,
    payload: {
      nama?: string;
      alamat?: string | null;
      latitude?: number;
      longitude?: number;
      radius_meter?: number;
      is_active?: boolean;
    }
  ): Promise<PresensiLocation | null> {
    const result = await db.query(
      `
        UPDATE presensi_locations
        SET
          nama = COALESCE($1, nama),
          alamat = COALESCE($2, alamat),
          latitude = COALESCE($3, latitude),
          longitude = COALESCE($4, longitude),
          radius_meter = COALESCE($5, radius_meter),
          is_active = COALESCE($6, is_active),
          updated_at = NOW()
        WHERE id = $7
        RETURNING
          id, nama, alamat, latitude, longitude,
          radius_meter, is_active, created_at, updated_at
      `,
      [
        payload.nama ?? null,
        payload.alamat ?? null,
        payload.latitude ?? null,
        payload.longitude ?? null,
        payload.radius_meter ?? null,
        payload.is_active ?? null,
        id,
      ]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  // ==========================================================
  // NONAKTIFKAN LOKASI (soft delete)
  // ==========================================================
  async remove(id: string): Promise<boolean> {
    const result = await db.query(
      `
        UPDATE presensi_locations
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ==========================================================
  // ASSIGNMENT — READ
  // ==========================================================
  async getEmployeeIdsByLocation(locationId: string): Promise<string[]> {
    const result = await db.query(
      `SELECT employee_id FROM presensi_employee_locations WHERE location_id = $1`,
      [locationId]
    );
    return result.rows.map((r) => String(r.employee_id));
  }

  async getLocationIdsByEmployee(employeeId: string): Promise<string[]> {
    const result = await db.query(
      `SELECT location_id FROM presensi_employee_locations WHERE employee_id = $1`,
      [employeeId]
    );
    return result.rows.map((r) => String(r.location_id));
  }

  // ==========================================================
  // ASSIGNMENT — WRITE per LOKASI
  // ==========================================================
  async setEmployeesForLocation(
    locationId: string,
    employeeIds: string[]
  ): Promise<void> {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM presensi_employee_locations WHERE location_id = $1`,
        [locationId]
      );
      if (employeeIds.length > 0) {
        const placeholders = employeeIds
          .map((_, i) => `($1, $${i + 2})`)
          .join(", ");
        await client.query(
          `INSERT INTO presensi_employee_locations (location_id, employee_id)
           VALUES ${placeholders}
           ON CONFLICT (employee_id, location_id) DO NOTHING`,
          [locationId, ...employeeIds]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  // ==========================================================
  // ASSIGNMENT — WRITE per KARYAWAN
  // ==========================================================
  async setLocationsForEmployee(
    employeeId: string,
    locationIds: string[]
  ): Promise<void> {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM presensi_employee_locations WHERE employee_id = $1`,
        [employeeId]
      );
      if (locationIds.length > 0) {
        const placeholders = locationIds
          .map((_, i) => `($1, $${i + 2})`)
          .join(", ");
        await client.query(
          `INSERT INTO presensi_employee_locations (employee_id, location_id)
           VALUES ${placeholders}
           ON CONFLICT (employee_id, location_id) DO NOTHING`,
          [employeeId, ...locationIds]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}

export default new LokasiRepository();