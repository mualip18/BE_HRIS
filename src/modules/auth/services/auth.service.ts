
import { verifyGoogleToken } from "../../../core/utils/google";
import { generateToken } from "../../../core/utils/jwt";
import * as repo from "../repositories/auth.repository";

// ======================================
// NORMALIZE EMAIL
// ======================================

const normalizeEmail = (email: unknown): string => {
  if (typeof email !== "string" || !email.trim()) {
    throw new Error("Email wajib diisi.");
  }

  return email.trim().toLowerCase();
};

// ======================================
// MAP ROLE
// Role diambil dari profiles.role
// ======================================

const mapRole = (roleInput: unknown): string => {
  if (typeof roleInput !== "string") {
    return "guest";
  }

  switch (roleInput.trim().toLowerCase()) {
    case "admin":
      return "admin";

    case "rekrutmen_admin":
      return "rekrutmen_admin";

    case "presensi_admin":
      return "presensi_admin";

    case "employee":
    case "user":
      return "employee";

    default:
      return "guest";
  }
};

// ======================================
// BUILD AUTH USER
// ======================================

const buildAuthUser = (
  user: repo.ProfileAuthUser,
  role: string
) => ({
  id: user.profile_id,
  uuid: user.uuid,
  name: user.name,
  email: user.email,
  role,
  avatar: user.avatar || null,
});

// ======================================
// REGISTER
// Pendaftaran publik dinonaktifkan
// ======================================

export const register = async (_data: any) => {
  throw new Error(
    "Pendaftaran akun publik dinonaktifkan. Hubungi administrator."
  );
};

// ======================================
// LOGIN EMAIL + PASSWORD
// Belum tersedia di skema profiles
// ======================================

export const login = async (
  _emailInput: string,
  _password: string
) => {
  throw new Error(
    "Login email dan password belum tersedia. Gunakan Google login."
  );
};

// ======================================
// LOGIN GOOGLE
// ======================================

export const loginWithGoogle = async (
  googleToken: string
) => {
  if (
    typeof googleToken !== "string" ||
    !googleToken.trim()
  ) {
    throw new Error("Token Google wajib diisi.");
  }

  // Validasi token Google dan ambil identitas pengguna.
  const googleUser = await verifyGoogleToken(googleToken);
  const email = normalizeEmail(googleUser.email);

  // Akun wajib sudah terdaftar di profiles.
  let user = await repo.findUserByEmail(email);

  if (!user) {
    throw new Error(
      "Email Google belum terdaftar di HRIS. Hubungi administrator."
    );
  }

  // Jangan izinkan akun nonaktif masuk.
  const status = user.status?.trim().toLowerCase();

  if (status !== "active" && status !== "aktif") {
    throw new Error(
      "Akun HRIS tidak aktif. Hubungi administrator."
    );
  }

  // Pastikan UUID tersedia untuk JWT.
  if (!user.uuid) {
    const uuid = await repo.ensureProfileUuid(user.profile_id);
    user = { ...user, uuid };
  }

  const role = mapRole(user.role_name);

  if (role === "guest") {
    throw new Error(
      "Role akun belum dikenali. Hubungi administrator."
    );
  }

  const token = generateToken({
    id: user.uuid,
    role,
  });

  return {
    success: true,
    user: buildAuthUser(user, role),
    token,
  };
};

// ======================================
// VERIFY OTP
// Belum tersedia di skema database
// ======================================

export const verifyOTP = async (
  _userUuid: string,
  _otp: string
) => {
  throw new Error(
    "Verifikasi OTP belum tersedia pada konfigurasi database saat ini."
  );
};
