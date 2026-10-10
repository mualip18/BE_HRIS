import presensiRepository
  from "../repositories/presensi.repository";

import type {
  CheckInPayload,
  CheckOutPayload,
} from "../types/presensi.types";

// ============================================================
// DATE / TIME HELPERS — Asia/Jakarta
// ============================================================
function getToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getCurrentMinutesJakarta(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function timeToMinutes(value: string): number {
  const parts = value.slice(0, 5).split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

function minutesToHHMM(total: number): string {
  const t = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(t / 60)).padStart(2, "0");
  const mm = String(t % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

// ============================================================
// SAKAMOTO (0=Minggu, 1=Senin, ..., 6=Sabtu)
// ============================================================
function getDayOfWeek(
  year: number,
  month: number,
  day: number
): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let y = year;
  if (month < 3) y -= 1;
  return (
    y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) +
    t[month - 1] +
    day
  ) % 7;
}

function toIsoDate(v: any): string {
  if (!v) return "";

  if (typeof v === "string") {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;

    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${mm}-${dd}`;
    }
  }

  if (v instanceof Date) {
    const y = v.getUTCFullYear();
    const mm = String(v.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  return "";
}

// ============================================================
// REKAP HELPERS
// ============================================================
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const HARI_SINGKAT = ["Mi", "Sn", "Sl", "Ra", "Ka", "Ju", "Sa"];

const BULAN_NAMA = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function expandLeaveDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

class PresensiService {
  // ==========================================================
  // GET MY STATUS
  // ==========================================================
  async getMyStatus(userUuid: string) {
    const employee =
      await presensiRepository.getActiveEmployeeByUserUuid(userUuid);

    if (!employee) {
      return {
        isEmployee: false,
        isActiveEmployee: false,
        employee: null,
        presensi: null,
        shift: null,
      };
    }

    const tanggal = getToday();
    const presensi = await presensiRepository.getByEmployeeDate(
      employee.id,
      tanggal
    );
    const shift = await presensiRepository.getTodayShift(
      employee.id,
      tanggal
    );

    return {
      isEmployee: true,
      isActiveEmployee: true,
      employee,
      presensi,
      shift,
    };
  }

  // ==========================================================
  // CHECK IN
  // ==========================================================
  async checkIn(userUuid: string, payload: CheckInPayload) {
    const employee =
      await presensiRepository.getActiveEmployeeByUserUuid(userUuid);

    if (!employee) throw new Error("Anda bukan karyawan aktif.");

    const tanggal = getToday();
    const existing = await presensiRepository.getByEmployeeDate(
      employee.id,
      tanggal
    );

    if (existing) {
      throw new Error("Anda sudah melakukan presensi masuk hari ini.");
    }

    const shift = await presensiRepository.getTodayShift(
      employee.id,
      tanggal
    );

    if (!shift) {
      throw new Error(
        "Anda belum memiliki jadwal shift hari ini. Hubungi admin untuk mengatur shift."
      );
    }

    const currentMinutes = getCurrentMinutesJakarta();
    const masukMinutes = timeToMinutes(shift.jamMasuk);
    const pulangMinutes = timeToMinutes(shift.jamPulang);
    const toleransi = Number(shift.toleransiMenit ?? 0);
    const absenMulaiMenit = Number(shift.absenMulaiMenit ?? 60);

    const isLintasHari = pulangMinutes <= masukMinutes;
    const jamMulaiAbsen = masukMinutes - absenMulaiMenit;

    if (!isLintasHari) {
      // Belum waktunya absen → pesan informatif
      if (currentMinutes < jamMulaiAbsen) {
        const sisa = jamMulaiAbsen - currentMinutes;
        throw new Error(
          `Belum waktunya absen. Shift "${shift.nama}" mulai jam ${shift.jamMasuk}. ` +
          `Anda bisa absen mulai jam ${minutesToHHMM(jamMulaiAbsen)} ` +
          `(${absenMulaiMenit} menit sebelum jam masuk). ` +
          `Silakan tunggu ${sisa} menit lagi.`
        );
      }

      // Sudah lewat jam pulang → window habis
      if (currentMinutes > pulangMinutes) {
        throw new Error(
          `Waktu absen sudah berakhir. Shift "${shift.nama}" berakhir jam ${shift.jamPulang}. Hubungi admin untuk koreksi.`
        );
      }
    } else {
      // Lintas hari: hanya cek belum masuk window
      if (currentMinutes < jamMulaiAbsen && currentMinutes > pulangMinutes) {
        const sisa = jamMulaiAbsen - currentMinutes;
        throw new Error(
          `Belum waktunya absen. Shift "${shift.nama}" mulai jam ${shift.jamMasuk}. ` +
          `Anda bisa absen mulai jam ${minutesToHHMM(jamMulaiAbsen)}. ` +
          `Silakan tunggu ${sisa} menit lagi.`
        );
      }
    }

    // Hitung keterlambatan
    let status: "HADIR" | "TERLAMBAT" = "HADIR";
    let menitTerlambat = 0;
    const batasMasuk = masukMinutes + toleransi;

    if (currentMinutes > batasMasuk) {
      menitTerlambat = currentMinutes - masukMinutes;
      status = "TERLAMBAT";
    }

    return presensiRepository.checkIn(
      employee.id,
      tanggal,
      payload,
      shift.id,
      status,
      menitTerlambat
    );
  }

  // ==========================================================
  // CHECK OUT
  // ==========================================================
  async checkOut(userUuid: string, payload: CheckOutPayload) {
    const employee =
      await presensiRepository.getActiveEmployeeByUserUuid(userUuid);

    if (!employee) throw new Error("Anda bukan karyawan aktif.");

    const tanggal = getToday();
    const existing = await presensiRepository.getByEmployeeDate(
      employee.id,
      tanggal
    );

    // --------------------------------------------------------
    // BELUM CHECK-IN → cek window dulu
    // --------------------------------------------------------
    if (!existing) {
      const shift = await presensiRepository.getTodayShift(
        employee.id,
        tanggal
      );

      if (shift) {
        const currentMinutes = getCurrentMinutesJakarta();
        const masukMinutes = timeToMinutes(shift.jamMasuk);
        const pulangMinutes = timeToMinutes(shift.jamPulang);
        const absenMulaiMenit = Number(shift.absenMulaiMenit ?? 60);

        const jamMulaiAbsen = masukMinutes - absenMulaiMenit;
        const isLintasHari = pulangMinutes <= masukMinutes;

        // Belum masuk window absen
        if (!isLintasHari && currentMinutes < jamMulaiAbsen) {
          const sisa = jamMulaiAbsen - currentMinutes;
          throw new Error(
            `Belum waktunya absen. Shift "${shift.nama}" mulai jam ${shift.jamMasuk}. ` +
            `Anda bisa absen mulai jam ${minutesToHHMM(jamMulaiAbsen)} ` +
            `(${absenMulaiMenit} menit sebelum jam masuk). ` +
            `Silakan tunggu ${sisa} menit lagi, lalu absen masuk terlebih dahulu.`
          );
        }

        // Sudah lewat jam pulang → window habis
        if (!isLintasHari && currentMinutes > pulangMinutes) {
          throw new Error(
            `Waktu absen sudah berakhir. Shift "${shift.nama}" berakhir jam ${shift.jamPulang}. Hubungi admin untuk koreksi.`
          );
        }
      }

      // Dalam window tapi belum check-in
      throw new Error(
        "Anda belum melakukan presensi masuk hari ini. Silakan absen masuk terlebih dahulu."
      );
    }

    // --------------------------------------------------------
    // SUDAH CHECK-IN → cek belum check-out
    // --------------------------------------------------------
    if (existing.jamPulang) {
      throw new Error("Anda sudah melakukan presensi pulang hari ini.");
    }

    // --------------------------------------------------------
    // Hitung pulang cepat + auto lembur
    // --------------------------------------------------------
    let menitPulangCepat = 0;
    let overtime = {
      mulai: null as string | null,
      selesai: null as string | null,
      menit: 0,
    };

    if (
      existing.shiftJamPulang &&
      !existing.shiftJamPulang.startsWith("00:00")
    ) {
      const currentMinutes = getCurrentMinutesJakarta();
      const shiftPulangMinutes = timeToMinutes(existing.shiftJamPulang);

      if (currentMinutes < shiftPulangMinutes) {
        menitPulangCepat = shiftPulangMinutes - currentMinutes;
      }

      if (currentMinutes > shiftPulangMinutes) {
        const menitLembur = currentMinutes - shiftPulangMinutes;
        overtime = {
          mulai: minutesToHHMM(shiftPulangMinutes),
          selesai: minutesToHHMM(currentMinutes),
          menit: menitLembur,
        };
      }
    }

    return presensiRepository.checkOut(
      existing.id,
      payload,
      menitPulangCepat,
      overtime
    );
  }

  // ==========================================================
  // HISTORY
  // ==========================================================
  async getMyHistory(
    userUuid: string,
    startDate: string,
    endDate: string
  ) {
    return presensiRepository.getMyHistory(userUuid, startDate, endDate);
  }

  // ==========================================================
  // SHIFTS
  // ==========================================================
  async getShifts() {
    return presensiRepository.getShifts();
  }

  // ==========================================================
  // REKAP RANGE
  // ==========================================================
  async getRekap(filters: {
    startDate: string;
    endDate: string;
    employeeId?: string;
    shiftId?: string;
    status?: string;
  }) {
    if (!filters.startDate || !filters.endDate) {
      throw new Error("Periode wajib diisi.");
    }

    const rows = await presensiRepository.getRekap(filters);
    const leaves = await presensiRepository.getApprovedLeavesInRange(
      filters.startDate,
      filters.endDate
    );

    const cutiMap = new Map<string, string>();
    for (const lv of leaves) {
      for (const d of expandLeaveDates(lv.start_date, lv.end_date)) {
        cutiMap.set(`${lv.employee_id}|${d}`, lv.leave_type_name);
      }
    }

    const items = rows.map((row: any) => {
      const tanggalIso = toIsoDate(row.tanggal);
      const cuti = cutiMap.get(`${row.employee_id}|${tanggalIso}`);

      return {
        id: String(row.id),
        employeeId: String(row.employee_id),
        nama: row.nama,
        nik: row.nik,
        tanggal: tanggalIso,
        hari: HARI[row.dow] ?? "-",
        shiftId: row.shift_id ? String(row.shift_id) : null,
        shiftNama: row.shift_nama ?? null,
        jamMasuk: row.jam_masuk ?? null,
        jamPulang: row.jam_pulang ?? null,
        status: cuti ? "CUTI" : row.status,
        keteranganCuti: cuti ?? null,
        menitTerlambat: Number(row.menit_terlambat ?? 0),
        menitPulangCepat: Number(row.menit_pulang_cepat ?? 0),
        menitLembur: Number(row.menit_lembur ?? 0),
        metodeMasuk: row.metode_masuk ?? null,
        metodePulang: row.metode_pulang ?? null,
        catatan: row.catatan ?? null,
      };
    });

    const summary = {
      total: items.length,
      hadir: items.filter((x) => x.status === "HADIR").length,
      terlambat: items.filter((x) => x.status === "TERLAMBAT").length,
      cuti: items.filter((x) => x.status === "CUTI").length,
      izin: items.filter((x) => x.status === "IZIN").length,
      sakit: items.filter((x) => x.status === "SAKIT").length,
      alpha: items.filter((x) => x.status === "ALPHA").length,
      totalMenitTerlambat: items.reduce((a, x) => a + x.menitTerlambat, 0),
      totalMenitPulangCepat: items.reduce(
        (a, x) => a + x.menitPulangCepat,
        0
      ),
      totalMenitLembur: items.reduce((a, x) => a + x.menitLembur, 0),
    };

    return { items, summary };
  }

  // ==========================================================
  // REKAP BULANAN
  // ==========================================================
  async getRekapBulanan(
    month: number,
    year: number,
    employeeIds?: string[]
  ) {
    if (!month || month < 1 || month > 12) {
      throw new Error("Bulan tidak valid.");
    }
    if (!year || year < 2000) {
      throw new Error("Tahun tidak valid.");
    }

    const raw = await presensiRepository.getRekapBulanan(
      month,
      year,
      employeeIds
    );

    if (raw.employees.length === 0) {
      return { periode: null, employees: [] };
    }

    const {
      employees,
      presensi,
      leaves,
      shiftAssignments,
      startDate,
      endDate,
      lastDay,
    } = raw;

    const presensiMap = new Map<string, any>();
    for (const p of presensi) {
      const tanggal = toIsoDate(p.tanggal);
      if (!tanggal) continue;
      presensiMap.set(`${p.employee_id}|${tanggal}`, p);
    }

    const shiftMap = new Map<string, any>();
    for (const sa of shiftAssignments) {
      const tanggal = toIsoDate(sa.tanggal);
      if (!tanggal) continue;
      shiftMap.set(`${sa.employee_id}|${tanggal}`, sa);
    }

    const cutiMap = new Map<string, string>();
    for (const lv of leaves) {
      for (const d of expandLeaveDates(lv.start_date, lv.end_date)) {
        cutiMap.set(`${lv.employee_id}|${d}`, lv.leave_type_name);
      }
    }

    const mm = String(month).padStart(2, "0");

    const result = employees.map((emp: any) => {
      const days: any[] = [];
      let hadir = 0;
      let izin = 0;
      let luar = 0;
      let absen = 0;
      let terlambatKali = 0;
      let terlambatMenit = 0;
      let pulangCepatKali = 0;
      let pulangCepatMenit = 0;
      let lemburKali = 0;
      let lemburMenit = 0;

      for (let d = 1; d <= lastDay; d++) {
        const dd = String(d).padStart(2, "0");
        const tanggal = `${year}-${mm}-${dd}`;

        const dayOfWeek = getDayOfWeek(year, month, d);
        const hari = HARI_SINGKAT[dayOfWeek];

        const key = `${emp.id}|${tanggal}`;
        const p = presensiMap.get(key);
        const shift = shiftMap.get(key);
        const cuti = cutiMap.get(key);

        let status = "ALPHA";
        let jamMasuk: string | null = null;
        let jamPulang: string | null = null;
        let lemburMulai: string | null = null;
        let lemburSelesai: string | null = null;
        let metodeMasuk: string | null = null;
        let metodePulang: string | null = null;

        let shiftId: string | null = shift?.shift_id
          ? String(shift.shift_id)
          : null;
        let shiftNama: string | null = shift?.shift_nama ?? null;
        let shiftJamMasuk: string | null = shift?.shift_jam_masuk ?? null;
        let shiftJamPulang: string | null = shift?.shift_jam_pulang ?? null;

        let menitTerlambat = 0;
        let menitPulangCepat = 0;
        let menitLembur = 0;

        if (p) {
          jamMasuk = p.jam_masuk;
          jamPulang = p.jam_pulang;
          lemburMulai = p.lembur_mulai;
          lemburSelesai = p.lembur_selesai;
          metodeMasuk = p.metode_masuk;
          metodePulang = p.metode_pulang;

          if (p.shift_nama) {
            shiftId = p.shift_id ? String(p.shift_id) : shiftId;
            shiftNama = p.shift_nama;
            shiftJamMasuk = p.shift_jam_masuk ?? shiftJamMasuk;
            shiftJamPulang = p.shift_jam_pulang ?? shiftJamPulang;
          }

          menitTerlambat = Number(p.menit_terlambat ?? 0);
          menitPulangCepat = Number(p.menit_pulang_cepat ?? 0);
          menitLembur = Number(p.menit_lembur ?? 0);
          status = p.status;

          if (status === "HADIR" || status === "TERLAMBAT") hadir++;
          else if (status === "IZIN") izin++;
          else if (status === "LIBUR") luar++;

          if (menitTerlambat > 0) {
            terlambatKali++;
            terlambatMenit += menitTerlambat;
          }
          if (menitPulangCepat > 0) {
            pulangCepatKali++;
            pulangCepatMenit += menitPulangCepat;
          }
          if (menitLembur > 0) {
            lemburKali++;
            lemburMenit += menitLembur;
          }
        } else if (cuti) {
          status = "CUTI";
          izin++;
        } else {
          if (dayOfWeek !== 0 && dayOfWeek !== 6) absen++;
        }

        days.push({
          tanggal,
          hari,
          shiftId,
          shiftNama,
          shiftJamMasuk,
          shiftJamPulang,
          jamMasuk,
          jamPulang,
          lemburMulai,
          lemburSelesai,
          metodeMasuk,
          metodePulang,
          status,
          keteranganCuti: cuti ?? null,
          menitTerlambat,
          menitPulangCepat,
          menitLembur,
        });
      }

      return {
        employeeId: String(emp.id),
        nama: emp.nama,
        nik: emp.nik,
        jabatan: emp.jabatan ?? null,
        posisi: emp.posisi ?? null,
        days,
        summary: {
          absen,
          izin,
          luar,
          hariKerja: hadir,
          hariKerjaSpesial: 0,
          terlambatKali,
          terlambatMenit,
          pulangCepatKali,
          pulangCepatMenit,
          lemburKali,
          lemburMenit,
        },
      };
    });

    const periode = {
      start: startDate,
      end: endDate,
      label: `01 ${BULAN_NAMA[month - 1]} ${year} - ${lastDay} ${
        BULAN_NAMA[month - 1]
      } ${year}`,
    };

    return { periode, employees: result };
  }
}

export default new PresensiService();