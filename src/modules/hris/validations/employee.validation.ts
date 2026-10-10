import type {
  EmployeeStatus,
  JenisKepegawaian,
} from "../types/employee.types";

/* ============================================================
   UUID
============================================================ */

export function validateEmployeeId(
  id: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}

/* ============================================================
   STATUS
============================================================ */

export function validateEmployeeStatus(
  status: string | undefined | null
): status is EmployeeStatus {
  return (
    status === "AKTIF" ||
    status === "NONAKTIF"
  );
}

/* ============================================================
   JENIS KEPEGAWAIAN
============================================================ */

export function validateJenisKepegawaian(
  jenis: string | undefined | null
): jenis is JenisKepegawaian {
  return (
    jenis === "TETAP" ||
    jenis === "KONTRAK" ||
    jenis === "PARUH_WAKTU"
  );
}

/* ============================================================
   DATE
   HANYA YYYY-MM-DD
============================================================ */

export function validateDate(
  value: string | null | undefined
): boolean {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return true;
  }

  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}