
import {
  hashPassword,
  comparePassword,
} from "../../../core/utils/bcrypt";

import {
  verifyGoogleToken,
} from "../../../core/utils/google";

import {
  generateToken,
} from "../../../core/utils/jwt";

import * as repo from "../repositories/auth.repository";

import {
  generate2FASecret,
  verify2FACode,
} from "../../../core/utils/otp";

const ROLE = {
  ADMIN: 1,
  REKRUTMEN_ADMIN: 2,
  EMPLOYEE: 3,
  PRESENSI_ADMIN: 4,
} as const;

const mapRole = (roleId: number): string => {
  switch (Number(roleId)) {
    case ROLE.ADMIN:
      return "admin";
    case ROLE.REKRUTMEN_ADMIN:
      return "rekrutmen_admin";
    case ROLE.EMPLOYEE:
      return "employee";
    case ROLE.PRESENSI_ADMIN:
      return "presensi_admin";
    default:
      return "guest";
  }
};

const normalizeEmail = (email: unknown): string => {
  if (typeof email !== "string" || !email.trim()) {
    throw new Error("Email wajib diisi");
  }

  return email.trim().toLowerCase();
};

const buildAuthUser = (user: any, role: string) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role,
  avatar: user.avatar || null,
});

// ======================================
// REGISTER
// ======================================

export const register = async (data: any) => {
  const email = normalizeEmail(data?.email);

  if (
    typeof data?.name !== "string" ||
    !data.name.trim()
  ) {
    throw new Error("Nama wajib diisi");
  }

  if (
    typeof data?.password !== "string" ||
    data.password.length < 8
  ) {
    throw new Error("Password minimal 8 karakter");
  }

  const existing = await repo.findUserByEmail(email);

  if (existing) {
    throw new Error("Email sudah digunakan");
  }

  const hashed = await hashPassword(data.password);

  const user = await repo.createUser({
    ...data,
    email,
    name: data.name.trim(),
    password: hashed,
  });

  return {
    success: true,
    user,
  };
};

// ======================================
// LOGIN EMAIL + PASSWORD
// ======================================

export const login = async (
  emailInput: string,
  password: string
) => {
  const email = normalizeEmail(emailInput);

  if (typeof password !== "string" || !password) {
    throw new Error("Password wajib diisi");
  }

  const user = await repo.findUserByEmail(email);

  if (!user) {
    throw new Error("Email atau password salah");
  }

  if (!user.password || user.password === "GOOGLE_LOGIN") {
    throw new Error(
      "Akun ini menggunakan login Google"
    );
  }

  const match = await comparePassword(
    password,
    user.password
  );

  if (!match) {
    throw new Error("Email atau password salah");
  }

  const role = mapRole(user.role_id);

  if (!user.two_factor_enabled) {
    const data = await generate2FASecret(user.email);

    await repo.save2FASecret(user.uuid, data.secret);

    return {
      success: true,
      requires2FASetup: true,
      qrCode: data.qrCode,
      userUuid: user.uuid,
    };
  }

  return {
    success: true,
    requiresOTP: true,
    userUuid: user.uuid,
  };
};

// ======================================
// LOGIN GOOGLE
// ======================================

export const loginWithGoogle = async (
  googleToken: string
) => {
  const googleUser = await verifyGoogleToken(googleToken);
  const email = normalizeEmail(googleUser.email);

  let user = await repo.findUserByEmail(email);

  if (!user) {
    user = await repo.createGoogleUser({
      name: googleUser.name || "Google User",
      email,
      avatar: googleUser.picture || "",
      role_id: ROLE.EMPLOYEE,
    });
  }

  if (!user?.uuid || !user?.id) {
    console.error(
      "[GOOGLE LOGIN] User record lacks required identifiers"
    );
    throw new Error(
      "Data akun belum lengkap. Hubungi administrator."
    );
  }

  const role = mapRole(user.role_id);

  if (role === "guest") {
    throw new Error(
      "Role akun belum dikonfigurasi. Hubungi administrator."
    );
  }

  const token = generateToken({
    id: String(user.uuid),
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
// ======================================

export const verifyOTP = async (
  userUuid: string,
  otp: string
) => {
  if (
    typeof userUuid !== "string" ||
    !userUuid.trim()
  ) {
    throw new Error("User UUID wajib diisi");
  }

  if (
    typeof otp !== "string" ||
    !/^\d{6}$/.test(otp)
  ) {
    throw new Error("Format OTP tidak valid");
  }

  const user = await repo.findUserByUuid(userUuid);

  if (!user) {
    throw new Error("User tidak ditemukan");
  }

  if (!user.two_factor_secret) {
    throw new Error("2FA belum dikonfigurasi");
  }

  const verified = verify2FACode(
    user.two_factor_secret,
    otp
  );

  if (!verified) {
    throw new Error("OTP tidak valid");
  }

  if (!user.two_factor_enabled) {
    await repo.enable2FA(user.uuid);
  }

  const role = mapRole(user.role_id);

  const token = generateToken({
    id: String(user.uuid),
    role,
  });

  return {
    success: true,
    user: buildAuthUser(user, role),
    token,
  };
};
