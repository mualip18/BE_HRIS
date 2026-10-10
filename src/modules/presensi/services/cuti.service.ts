import cutiRepository from "../repositories/cuti.repository";

import {
  CreateLeaveRequestPayload,
  CreateLeaveTypePayload,
  UpdateLeaveBalancePayload,
  UpdateLeaveStatusPayload,
  UpdateLeaveTypePayload,
} from "../types/cuti.types";

class CutiService {
  // ============================================================
  // MASTER JENIS CUTI
  // ============================================================
  async getLeaveTypes() {
    return cutiRepository.getLeaveTypes();
  }

  async createLeaveType(payload: CreateLeaveTypePayload) {
    if (!payload.code?.trim()) {
      throw new Error("Kode cuti wajib diisi.");
    }
    if (!payload.name?.trim()) {
      throw new Error("Nama cuti wajib diisi.");
    }
    if (payload.default_days === undefined || payload.default_days < 0) {
      throw new Error("Jumlah hari cuti tidak boleh negatif.");
    }

    return cutiRepository.createLeaveType({
      ...payload,
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
    });
  }

  async updateLeaveType(id: string, payload: UpdateLeaveTypePayload) {
    return cutiRepository.updateLeaveType(id, payload);
  }

  async deleteLeaveType(id: string) {
    return cutiRepository.deleteLeaveType(id);
  }

  // ============================================================
  // EMPLOYEE
  // ============================================================
  async getEmployees() {
    return cutiRepository.getEmployees();
  }

  // ============================================================
  // BALANCE
  // ============================================================
  async getBalances(year: number) {
    if (!Number.isFinite(year) || year < 2000) {
      throw new Error("Tahun tidak valid.");
    }
    return cutiRepository.getBalances(year);
  }

  async updateBalance(payload: UpdateLeaveBalancePayload) {
    if (!payload.employee_id) {
      throw new Error("Karyawan wajib dipilih.");
    }
    if (!payload.leave_type_id) {
      throw new Error("Jenis cuti wajib dipilih.");
    }
    if (!payload.year) {
      throw new Error("Tahun wajib diisi.");
    }
    if (
      payload.allocated_days === undefined ||
      payload.allocated_days < 0
    ) {
      throw new Error("Jatah cuti tidak boleh negatif.");
    }
    return cutiRepository.upsertBalance(payload);
  }

  // ============================================================
  // REQUEST
  // ============================================================
  async getRequests(params: { status?: string; year?: number }) {
    return cutiRepository.getRequests(params);
  }

  async createRequest(payload: CreateLeaveRequestPayload) {
    if (!payload.employee_id) {
      throw new Error("Karyawan wajib dipilih.");
    }
    if (!payload.leave_type_id) {
      throw new Error("Jenis cuti wajib dipilih.");
    }
    if (!payload.start_date) {
      throw new Error("Tanggal mulai wajib diisi.");
    }
    if (!payload.end_date) {
      throw new Error("Tanggal selesai wajib diisi.");
    }

    const start = new Date(payload.start_date);
    const end = new Date(payload.end_date);

    if (isNaN(start.getTime())) {
      throw new Error("Tanggal mulai tidak valid.");
    }
    if (isNaN(end.getTime())) {
      throw new Error("Tanggal selesai tidak valid.");
    }
    if (end < start) {
      throw new Error(
        "Tanggal selesai tidak boleh lebih awal dari tanggal mulai."
      );
    }

    return cutiRepository.createRequest(payload);
  }

  // ============================================================
  // UPDATE STATUS
  // ============================================================
  async updateStatus(
    id: string,
    payload: UpdateLeaveStatusPayload,
    approvedBy: number
  ) {
    if (!payload.status) {
      throw new Error("Status cuti wajib diisi.");
    }

    if (
      !["APPROVED", "REJECTED", "CANCELLED"].includes(payload.status)
    ) {
      throw new Error("Status cuti tidak valid.");
    }

    if (
      payload.status === "REJECTED" &&
      !payload.rejection_reason?.trim()
    ) {
      throw new Error("Alasan penolakan wajib diisi.");
    }

    return cutiRepository.updateStatus(id, payload, approvedBy);
  }
}

export default new CutiService();