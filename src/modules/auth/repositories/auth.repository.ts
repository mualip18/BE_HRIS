
import db from "../../../config/db";

// ======================================
// TYPES
// ======================================

export interface ProfileAuthUser {
  profile_id: number;
  uuid: string | null;
  name: string;
  email: string;
  avatar: string | null;
  role_name: string | null;
  status: string | null;
}

// ======================================
// FIND USER BY EMAIL
// Menggunakan tabel public.profiles
// ======================================

export const findUserByEmail = async (
  email: string
): Promise<ProfileAuthUser | undefined> => {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await db.query(
    `
      SELECT
        id AS profile_id,
        user_id AS uuid,
        nama AS name,
        email,
        avatar,
        role AS role_name,
        status
      FROM public.profiles
      WHERE LOWER(TRIM(email)) = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  return result.rows[0];
};

// ======================================
// FIND USER BY UUID
// Menggunakan profiles.user_id
// ======================================

export const findUserByUuid = async (
  uuid: string
): Promise<ProfileAuthUser | undefined> => {
  const result = await db.query(
    `
      SELECT
        id AS profile_id,
        user_id AS uuid,
        nama AS name,
        email,
        avatar,
        role AS role_name,
        status
      FROM public.profiles
      WHERE user_id = $1::uuid
      LIMIT 1
    `,
    [uuid]
  );

  return result.rows[0];
};

// ======================================
// ENSURE PROFILE UUID
// Membuat UUID untuk profil lama
// yang user_id-nya masih NULL
// ======================================

export const ensureProfileUuid = async (
  profileId: number
): Promise<string> => {
  const result = await db.query(
    `
      UPDATE public.profiles
      SET
        user_id = gen_random_uuid(),
        updated_at = NOW()
      WHERE id = $1
        AND user_id IS NULL
      RETURNING user_id
    `,
    [profileId]
  );

  if (result.rows[0]?.user_id) {
    return result.rows[0].user_id;
  }

  // Jika UUID sudah dibuat proses lain,
  // ambil UUID yang tersimpan.
  const existing = await db.query(
    `
      SELECT user_id
      FROM public.profiles
      WHERE id = $1
      LIMIT 1
    `,
    [profileId]
  );

  const uuid = existing.rows[0]?.user_id;

  if (!uuid) {
    throw new Error(
      "UUID akun tidak tersedia. Hubungi administrator."
    );
  }

  return uuid;
};

// ======================================
// CREATE USER
// Registrasi publik dinonaktifkan
// ======================================

export const createUser = async (
  _data: any
): Promise<never> => {
  throw new Error(
    "Pendaftaran akun publik dinonaktifkan. Hubungi administrator."
  );
};

// ======================================
// CREATE GOOGLE USER
// Akun harus dibuat oleh administrator
// dan sudah terdaftar di profiles.
// ======================================

export const createGoogleUser = async (
  _data: {
    name: string;
    email: string;
    avatar?: string;
    role_id: number;
  }
): Promise<never> => {
  throw new Error(
    "Akun Google belum terdaftar. Hubungi administrator."
  );
};

// ======================================
// SAVE 2FA SECRET
// Belum didukung oleh skema profiles
// ======================================

export const save2FASecret = async (
  _userUuid: string,
  _secret: string
): Promise<never> => {
  throw new Error(
    "Konfigurasi 2FA belum tersedia pada database."
  );
};

// ======================================
// ENABLE 2FA
// Belum didukung oleh skema profiles
// ======================================

export const enable2FA = async (
  _userUuid: string
): Promise<never> => {
  throw new Error(
    "Fitur 2FA belum tersedia pada database."
  );
};

// ======================================
// FIND ROLE BY NAME
// Menggunakan tabel public.roles
// ======================================

export const findRoleByName = async (
  name: string
): Promise<{ id: number; name: string } | undefined> => {
  const result = await db.query(
    `
      SELECT id, name
      FROM public.roles
      WHERE LOWER(name) = LOWER($1)
      LIMIT 1
    `,
    [name.trim()]
  );

  return result.rows[0];
};
