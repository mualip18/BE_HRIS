import shiftRepository from "../repositories/shift.repository";

class ShiftService {
  async getAll() {
    return shiftRepository.getAll();
  }

  async getAllAdmin() {
    return shiftRepository.getAllAdmin();
  }

  async create(payload: any) {
    if (!payload.nama?.trim()) {
      throw new Error("Nama shift wajib diisi.");
    }
    if (!payload.jam_masuk || !payload.jam_pulang) {
      throw new Error("Jam masuk dan pulang wajib diisi.");
    }
    if (payload.toleransi_menit < 0) {
      throw new Error("Toleransi tidak boleh negatif.");
    }
    if (
      payload.absen_mulai_menit === undefined ||
      payload.absen_mulai_menit < 0
    ) {
      throw new Error("Menit absen mulai tidak boleh negatif.");
    }

    return shiftRepository.create({
      nama: payload.nama.trim(),
      kode: payload.kode ?? null,
      jam_masuk: payload.jam_masuk,
      jam_pulang: payload.jam_pulang,
      toleransi_menit: Number(payload.toleransi_menit ?? 0),
      absen_mulai_menit: Number(payload.absen_mulai_menit ?? 60),
      lintas_hari: Boolean(payload.lintas_hari),
      status: payload.status ?? "AKTIF",
    });
  }

  async update(id: string, payload: any) {
    return shiftRepository.update(id, payload);
  }

  async remove(id: string) {
    const ok = await shiftRepository.remove(id);
    if (!ok) throw new Error("Shift tidak ditemukan.");
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
    if (!employeeId) throw new Error("Karyawan wajib dipilih.");
    if (!shiftId) throw new Error("Shift wajib dipilih.");
    if (!tanggalMulai) throw new Error("Tanggal mulai wajib diisi.");
    if (tanggalSelesai && tanggalSelesai < tanggalMulai) {
      throw new Error("Tanggal selesai tidak boleh lebih awal.");
    }

    return shiftRepository.assign(
      employeeId,
      shiftId,
      tanggalMulai,
      tanggalSelesai
    );
  }

  // ============================================================
  // ASSIGNMENT — LIST
  // ============================================================
  async getAssignments(filters: any) {
    return shiftRepository.getAssignments(filters);
  }

  // ============================================================
  // ASSIGNMENT — UPDATE STATUS ONLY
  // ============================================================
  async updateAssignmentStatus(id: string, status: string) {
    if (!["AKTIF", "NONAKTIF"].includes(status)) {
      throw new Error("Status assignment tidak valid.");
    }
    const ok = await shiftRepository.updateAssignmentStatus(id, status);
    if (!ok) throw new Error("Assignment tidak ditemukan.");
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
    if (payload.status && !["AKTIF", "NONAKTIF"].includes(payload.status)) {
      throw new Error("Status assignment tidak valid.");
    }

    if (
      payload.tanggal_mulai &&
      payload.tanggal_selesai &&
      payload.tanggal_selesai < payload.tanggal_mulai
    ) {
      throw new Error("Tanggal selesai tidak boleh lebih awal.");
    }

    const data = await shiftRepository.updateAssignment(id, payload);
    if (!data) throw new Error("Penempatan tidak ditemukan.");
    return data;
  }
}

export default new ShiftService();