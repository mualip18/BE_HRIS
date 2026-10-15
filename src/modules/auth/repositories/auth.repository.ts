
import db from "../../../config/db";

export interface ProfileAuthUser {
  profile_id: number;
  uuid: string | null;
  name: string;
  email: string;
  avatar: string | null;
  role_name: string;
  status: string;
}

const PROFILE_AUTH_COLUMNS = `
  id AS profile_id,
  user_id AS uuid,
  nama AS name,
  email,
  avatar,
  role AS role_name,
  status
`;

// Cari akun berdasarkan email pada tabel profiles.
export const findUserByEmail = async (
  email: string
): Promise<ProfileAuthUser | undefined> => {
  const result = await db.query(
    `
      SELECT ${PROFILE_AUTH_COLUMNS}
      FROM public.profiles
      WHERE LOWER(TRIM(email)) = $1
      LIMIT 1
    `,
    [email.trim().toLowerCase()]
  );

  return result.rows[0];
};

// Cari akun berdasarkan UUID autentikasi.
export const findUserByUuid = async (
  uuid: string
): Promise<ProfileAuthUser | undefined> => {
  const result = await db.query(
    `
      SELECT ${PROFILE_AUTH_COLUMNS}
      FROM public.profiles
      WHERE user_id = $1::uuid
      LIMIT 1
    `,
    [uuid]
  );

  return result.rows[0];
};

// Profil lama yang belum memiliki user_id mendapatkan UUID
// hanya ketika akun tersebut benar-benar ditemukan berdasarkan email.
export const ensureProfileUuid = async (
  profileId: number
): Promise<string> => {
  const updated = await db.query(
    `
      UPDATE public.profiles
      SET user_id = gen_random_uuid(),
          updated_at = NOW()
      WHERE id = $1
        AND user_id IS NULL
      RETURNING user_id
    `,
    [profileId]
  );

  if (updated.rows[0]?.user_id) {
    return updated.rows[0].user_id;
  }

  // Menangani kemungkinan UUID sudah dibuat oleh proses lain.
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
      "UUID akun tidak dapat dibuat. Hubungi administrator."
    );
  }

  return uuid;
};

// Pembuatan akun publik tidak diaktifkan.
export const createUser = async (_data: any): Promise<never> => {
  throw new Error(
    "Pembuatan akun publik dinonaktifkan. Hubungi administrator."
  );
};

export const createGoogleUser = async (
  _data: {
    name: string;
    email: string;
    avatar?: string;
    role_id: number;
  }
): Promise<never> => {
  throw new Error(
    "Akun Google harus terdaftar di profiles terlebih dahulu."
  );
};

// Tabel profiles belum memiliki kolom 2FA.
export const save2FASecret = async (
  _userUuid: string,
  _secret: string
): Promise<never> => {
  throw new Error(
    "2FA belum tersedia pada skema autentikasi database saat ini."
  );
};

export const enable2FA = async (
  _userUuid: string
): Promise<never> => {
  throw new Error(
    "2FA belum tersedia pada skema autentikasi database saat ini."
  );
};

export const findRoleByName = async (name: string) => {
  const result = await db.query(
    `
      SELECT id, name
      FROM public.roles
      WHERE name = $1
      LIMIT 1
    `,
    [name]
  );

  return result.rows[0];
};
