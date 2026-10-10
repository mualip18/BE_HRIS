import lokasiRepository from "../repositories/lokasi.repository";
import { findNearestLocationWithinRadius } from "../utils/geo.util";

interface LokasiInput {
  nama: string;
  alamat?: string | null;
  latitude: number;
  longitude: number;
  radius_meter: number;
  is_active?: boolean;
}

// ============================================================
// VALIDASI INPUT
// ============================================================
function validateInput(payload: LokasiInput) {
  if (!payload.nama?.trim()) {
    throw new Error("Nama lokasi wajib diisi.");
  }
  if (
    typeof payload.latitude !== "number" ||
    payload.latitude < -90 ||
    payload.latitude > 90
  ) {
    throw new Error("Latitude tidak valid.");
  }
  if (
    typeof payload.longitude !== "number" ||
    payload.longitude < -180 ||
    payload.longitude > 180
  ) {
    throw new Error("Longitude tidak valid.");
  }
  if (typeof payload.radius_meter !== "number" || payload.radius_meter <= 0) {
    throw new Error("Radius harus lebih dari 0 meter.");
  }
}

class LokasiService {
  async getAll(onlyActive = false) {
    return lokasiRepository.getAll(onlyActive);
  }

  async getById(id: string) {
    const data = await lokasiRepository.getById(id);
    if (!data) throw new Error("Lokasi tidak ditemukan.");
    return data;
  }

  async create(payload: LokasiInput) {
    validateInput(payload);
    return lokasiRepository.create({
      ...payload,
      nama: payload.nama.trim(),
    });
  }

  async update(id: string, payload: Partial<LokasiInput>) {
    if (
      payload.latitude !== undefined &&
      (payload.latitude < -90 || payload.latitude > 90)
    ) {
      throw new Error("Latitude tidak valid.");
    }
    if (
      payload.longitude !== undefined &&
      (payload.longitude < -180 || payload.longitude > 180)
    ) {
      throw new Error("Longitude tidak valid.");
    }
    if (payload.radius_meter !== undefined && payload.radius_meter <= 0) {
      throw new Error("Radius harus lebih dari 0 meter.");
    }

    const data = await lokasiRepository.update(id, payload);
    if (!data) throw new Error("Lokasi tidak ditemukan.");
    return data;
  }

  async remove(id: string) {
    const ok = await lokasiRepository.remove(id);
    if (!ok) throw new Error("Lokasi tidak ditemukan.");
  }

  // ==========================================================
  // VALIDASI RADIUS — dipanggil dari check-in / check-out
  // ==========================================================
  async validateRadius(
    userLat: number | null,
    userLng: number | null,
    employeeId?: string
  ) {
    if (userLat === null || userLng === null) {
      throw new Error("Lokasi GPS wajib dikirim untuk presensi.");
    }

    let locations = await lokasiRepository.getAll(true);

    if (locations.length === 0) {
      throw new Error("Belum ada lokasi presensi aktif. Hubungi admin.");
    }

    if (employeeId) {
      const assignedIds = await lokasiRepository.getLocationIdsByEmployee(
        employeeId
      );
      if (assignedIds.length > 0) {
        locations = locations.filter((l) => assignedIds.includes(l.id));
        if (locations.length === 0) {
          throw new Error(
            "Anda belum di-assign ke lokasi presensi mana pun. Hubungi admin."
          );
        }
      }
    }

    const check = findNearestLocationWithinRadius(userLat, userLng, locations);

    if (!check.inside) {
      const extra =
        check.distance !== null
          ? ` Jarak Anda ${check.distance} meter dari lokasi terdekat.`
          : "";
      throw new Error(`Anda berada di luar area presensi.${extra}`);
    }

    return check;
  }

  // ==========================================================
  // ASSIGNMENT per LOKASI
  // ==========================================================
  async getAssignedEmployees(locationId: string): Promise<string[]> {
    const lokasi = await lokasiRepository.getById(locationId);
    if (!lokasi) throw new Error("Lokasi tidak ditemukan.");
    return lokasiRepository.getEmployeeIdsByLocation(locationId);
  }

  async setAssignedEmployees(
    locationId: string,
    employeeIds: string[]
  ): Promise<void> {
    const lokasi = await lokasiRepository.getById(locationId);
    if (!lokasi) throw new Error("Lokasi tidak ditemukan.");
    if (!Array.isArray(employeeIds)) employeeIds = [];
    const unique = Array.from(new Set(employeeIds.filter(Boolean)));
    await lokasiRepository.setEmployeesForLocation(locationId, unique);
  }

  // ==========================================================
  // ASSIGNMENT per KARYAWAN
  // ==========================================================
  async getEmployeeLocations(employeeId: string): Promise<string[]> {
    return lokasiRepository.getLocationIdsByEmployee(employeeId);
  }

  async setEmployeeLocations(
    employeeId: string,
    locationIds: string[]
  ): Promise<void> {
    if (!Array.isArray(locationIds)) locationIds = [];
    const unique = Array.from(new Set(locationIds.filter(Boolean)));
    await lokasiRepository.setLocationsForEmployee(employeeId, unique);
  }
}

export default new LokasiService();