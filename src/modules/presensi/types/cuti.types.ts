// ============================================================
// JENIS CUTI
// ============================================================
export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  default_days: number;
  requires_attachment: boolean;
  is_paid: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveTypePayload {
  code: string;
  name: string;
  description?: string | null;
  default_days: number;
  requires_attachment?: boolean;
  is_paid?: boolean;
  is_active?: boolean;
}

export interface UpdateLeaveTypePayload {
  code?: string;
  name?: string;
  description?: string | null;
  default_days?: number;
  requires_attachment?: boolean;
  is_paid?: boolean;
  is_active?: boolean;
}

// ============================================================
// BALANCE / JATAH CUTI
// ============================================================
export interface UpdateLeaveBalancePayload {
  employee_id: string;
  leave_type_id: string;
  year: number;
  allocated_days: number;
  notes?: string | null;
}

export interface LeaveBalance {
  employee_id: string;
  employee_name: string;
  nik: string | null;
  jabatan: string | null;
  leave_type_id: string;
  leave_type_code: string;
  leave_type_name: string;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  year: number;
  notes: string | null;
}

// ============================================================
// EMPLOYEE
// ============================================================
export interface LeaveEmployee {
  id: string;
  nama: string;
  nik: string | null;
  jabatan: string | null;
  posisi: string | null;
  status_karyawan: string;
}

// ============================================================
// REQUEST CUTI
// ============================================================
export interface CreateLeaveRequestPayload {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string | null;
  attachment?: string | null;
}

export type LeaveStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export interface UpdateLeaveStatusPayload {
  status: LeaveStatus;
  rejection_reason?: string | null;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  nik: string | null;
  jabatan: string | null;
  leave_type_id: string;
  leave_type_code: string;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  attachment: string | null;
  status: LeaveStatus;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}