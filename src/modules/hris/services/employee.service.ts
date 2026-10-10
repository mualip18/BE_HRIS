
import employeeRepository
  from "../repositories/employee.repository";

import type {
  EmployeeListQuery,
  EmployeeUpdatePayload,
} from "../types/employee.types";


// ============================================================
// EMPLOYEE SERVICE
// ============================================================

class EmployeeService {


  /* ============================================================
     INITIALIZE
  ============================================================ */

  async initialize(): Promise<void> {

    await employeeRepository.ensureTable();

  }


  /* ============================================================
     GET ALL
  ============================================================ */

  async getAll(
    query: EmployeeListQuery = {}
  ) {

    return employeeRepository.getAll(
      query
    );

  }


  /* ============================================================
     GET BY ID
  ============================================================ */

  async getById(
    id: string
  ) {

    return employeeRepository.getById(
      id
    );

  }


  /* ============================================================
     UPDATE
  ============================================================ */

  async update(
    id: string,
    payload: EmployeeUpdatePayload
  ) {

    return employeeRepository.update(
      id,
      payload
    );

  }

}


// ============================================================
// EXPORT
// ============================================================

export default new EmployeeService();