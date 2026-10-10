
import employeeRepository from "../repositories/employee.repository";

import type {
  EmployeeListQuery,
  EmployeeUpdatePayload,
} from "../types/employee.types";

// ============================================================
// EMPLOYEE SERVICE
// ============================================================

class EmployeeService {
  /**
   * Memastikan tabel dan kolom kepegawaian tersedia.
   */
  async initialize(): Promise<void> {
    await employeeRepository.ensureTable();
  }

  /**
   * Mengambil daftar karyawan dan ringkasan.
   */
  async getAll(query: EmployeeListQuery = {}) {
    return employeeRepository.getAll(query);
  }

  /**
   * Mengambil detail karyawan berdasarkan ID.
   */
  async getById(id: string) {
    return employeeRepository.getById(id);
  }

  /**
   * Memperbarui data kepegawaian.
   */
  async update(
    id: string,
    payload: EmployeeUpdatePayload
  ) {
    return employeeRepository.update(id, payload);
  }
}

export default new EmployeeService();
