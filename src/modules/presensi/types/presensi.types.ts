export type PresensiStatus =
  | "HADIR"
  | "TERLAMBAT"
  | "IZIN"
  | "SAKIT"
  | "ALPHA"
  | "LIBUR"
  | "CUTI";

export type VerificationMethod =
  | "MANUAL"
  | "FOTO"
  | "FACE_RECOGNITION";

export interface PresensiShift {
  id: string;
  nama: string;
  kode: string | null;
  jamMasuk: string;
  jamPulang: string;
  toleransiMenit: number;
  absenMulaiMenit: number; // ⬅️ BARU
  lintasHari: boolean;
  status: string;
}

export interface PresensiEmployee {
  id: string;
  nama: string;
  userId: string | null;
  statusKaryawan: string | null;
}

export interface Presensi {
  id: string;
  employeeId: string;
  nama: string;
  tanggal: string;

  shiftId: string | null;
  shiftNama: string | null;
  shiftJamMasuk: string | null;
  shiftJamPulang: string | null;

  jamMasuk: string | null;
  jamPulang: string | null;

  lokasiMasukLat: number | null;
  lokasiMasukLng: number | null;
  alamatMasuk: string | null;

  lokasiPulangLat: number | null;
  lokasiPulangLng: number | null;
  alamatPulang: string | null;

  fotoMasuk: string | null;
  fotoPulang: string | null;

  metodeMasuk: VerificationMethod | null;
  metodePulang: VerificationMethod | null;

  faceVerifiedMasuk: boolean;
  faceVerifiedPulang: boolean;

  faceSimilarityMasuk: number | null;
  faceSimilarityPulang: number | null;

  status: PresensiStatus;

  menitTerlambat: number;
  menitPulangCepat: number;

  lemburMulai: string | null;
  lemburSelesai: string | null;
  menitLembur: number;

  catatan: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CheckInPayload {
  latitude?: number | null;
  longitude?: number | null;
  alamat?: string | null;
  foto?: string | null;
  metode?: VerificationMethod;
  faceVerified?: boolean;
  faceSimilarity?: number | null;
  catatan?: string | null;
}

export interface CheckOutPayload {
  latitude?: number | null;
  longitude?: number | null;
  alamat?: string | null;
  foto?: string | null;
  metode?: VerificationMethod;
  faceVerified?: boolean;
  faceSimilarity?: number | null;
  catatan?: string | null;
}

export interface OvertimePayload {
  mulai: string;
  selesai: string;
  catatan?: string | null;
}

export interface PresensiLocation {
  id: string;
  nama: string;
  alamat: string | null;
  latitude: number;
  longitude: number;
  radius_meter: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  employeeNama: string;
  shiftId: string;
  shiftNama: string;
  tanggalMulai: string;
  tanggalSelesai: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PresensiRekapItem {
  id: string;
  employeeId: string;
  nama: string;
  nik: string | null;
  tanggal: string;
  hari: string;
  shiftId: string | null;
  shiftNama: string | null;
  jamMasuk: string | null;
  jamPulang: string | null;
  status: PresensiStatus;
  keteranganCuti: string | null;
  menitTerlambat: number;
  menitPulangCepat: number;
  menitLembur: number;
  metodeMasuk?: string | null;
  metodePulang?: string | null;
  catatan: string | null;
}

export interface PresensiRekapSummary {
  total: number;
  hadir: number;
  terlambat: number;
  cuti: number;
  izin: number;
  sakit: number;
  alpha: number;
  totalMenitTerlambat: number;
  totalMenitPulangCepat: number;
  totalMenitLembur: number;
}

export interface PresensiRekapResponse {
  items: PresensiRekapItem[];
  summary: PresensiRekapSummary;
}

export interface PresensiQuery {
  startDate: string;
  endDate: string;
}

export interface FaceStatus {
  registered: boolean;
  registeredAt: string | null;
  fotoPath: string | null;
}

export interface FaceRegisterResult {
  registered: boolean;
  similarity: number;
  confidence: number;
  real: number;
  live: number;
  faceId: string;
}

export interface FaceVerifyResult {
  matched: boolean;
  similarity: number;
  threshold: number;
  confidence: number;
  real: number;
  live: number;
}

export interface FaceStatusResponse {
  success: boolean;
  data: FaceStatus;
}

export interface FaceRegisterResponse {
  success: boolean;
  message: string;
  data: FaceRegisterResult;
}

export interface FaceVerifyResponse {
  success: boolean;
  message?: string;
  data: FaceVerifyResult;
}

// ============================================================
// REKAP BULANAN
// ============================================================
export interface RekapBulananDay {
  tanggal: string;
  hari: string;

  shiftId: string | null;
  shiftNama: string | null;
  shiftJamMasuk: string | null;
  shiftJamPulang: string | null;

  jamMasuk: string | null;
  jamPulang: string | null;

  lemburMulai: string | null;
  lemburSelesai: string | null;

  metodeMasuk: string | null;
  metodePulang: string | null;

  status: string;
  keteranganCuti: string | null;

  menitTerlambat: number;
  menitPulangCepat: number;
  menitLembur: number;
}

export interface RekapBulananSummary {
  absen: number;
  izin: number;
  luar: number;
  hariKerja: number;
  hariKerjaSpesial: number;
  terlambatKali: number;
  terlambatMenit: number;
  pulangCepatKali: number;
  pulangCepatMenit: number;
  lemburKali: number;
  lemburMenit: number;
}

export interface RekapBulananEmployee {
  employeeId: string;
  nama: string;
  nik: string | null;
  jabatan: string | null;
  posisi: string | null;
  days: RekapBulananDay[];
  summary: RekapBulananSummary;
}

export interface RekapBulananResponse {
  periode: {
    start: string;
    end: string;
    label: string;
  } | null;
  employees: RekapBulananEmployee[];
}