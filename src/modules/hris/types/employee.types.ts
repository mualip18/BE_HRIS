
// ============================================================
// EMPLOYEE STATUS
// ============================================================

export type EmployeeStatus =
  | "AKTIF"
  | "NONAKTIF";


// ============================================================
// JENIS KEPEGAWAIAN
// ============================================================

export type JenisKepegawaian =
  | "TETAP"
  | "KONTRAK"
  | "PARUH_WAKTU";


// ============================================================
// EMPLOYEE
// ============================================================

export interface Employee {

  id: string;

  applyId:
    number | null;

  lowonganId:
    number | null;

  userId:
    string | null;


  // ----------------------------------------------------------
  // IDENTITAS
  // ----------------------------------------------------------

  nama:
    string;

  email:
    string | null;

  nik:
    string | null;

  noHp:
    string | null;

  tempatLahir:
    string | null;

  tanggalLahir:
    string | null;

  agama:
    string | null;

  jenisKelamin:
    string | null;

  statusMenikah:
    string | null;

  pendidikanTerakhir:
    string | null;


  // ----------------------------------------------------------
  // ALAMAT
  // ----------------------------------------------------------

  provinsi:
    string | null;

  kota:
    string | null;

  kecamatan:
    string | null;

  alamat:
    string | null;


  // ----------------------------------------------------------
  // SOSIAL MEDIA
  // ----------------------------------------------------------

  instagram:
    string | null;

  tiktok:
    string | null;

  linkedin:
    string | null;

  twitter:
    string | null;


  // ----------------------------------------------------------
  // PEKERJAAN
  // ----------------------------------------------------------

  posisi:
    string | null;

  jabatan:
    string | null;

  lembaga:
    string | null;

  lokasi:
    string | null;

  expectedLocation:
    string | null;

  gaji:
    string | null;


  // ----------------------------------------------------------
  // STATUS SIAP BEKERJA
  // ----------------------------------------------------------

  siapBekerja:
    string | null;


  // ----------------------------------------------------------
  // DATA KEPEGAWAIAN
  // ----------------------------------------------------------

  nipy:
    string | null;

  jenisKepegawaian:
    JenisKepegawaian | null;

  tmt:
    string | null;

  tst:
    string | null;

  tanggalMasuk:
    string | null;


  // ----------------------------------------------------------
  // FILE DOKUMEN
  // ----------------------------------------------------------

  cvFile:
    string | null;

  ijazahFile:
    string | null;

  transkripFile:
    string | null;

  pendukungFile:
    string | null;


  // ----------------------------------------------------------
  // STATUS KARYAWAN
  // ----------------------------------------------------------

  statusKaryawan:
    EmployeeStatus;

  tanggalDiterima:
    string | null;


  // ----------------------------------------------------------
  // FOTO
  // ----------------------------------------------------------

  foto:
    string | null;


  // ----------------------------------------------------------
  // AUDIT
  // ----------------------------------------------------------

  createdAt:
    string | null;

  updatedAt:
    string | null;

}


// ============================================================
// LIST QUERY
// ============================================================

export interface EmployeeListQuery {

  page?:
    number;

  limit?:
    number;

  search?:
    string;

  status?:
    string;

  posisi?:
    string;

}


// ============================================================
// UPDATE PAYLOAD
// ============================================================

export interface EmployeeUpdatePayload {

  nipy?:
    string | null;

  jabatan?:
    string | null;

  posisi?:
    string | null;

  lokasi?:
    string | null;

  tanggalMasuk?:
    string | null;

  jenisKepegawaian?:
    | JenisKepegawaian
    | null;

  tmt?:
    string | null;

  tst?:
    string | null;

  statusKaryawan?:
    EmployeeStatus;

}
