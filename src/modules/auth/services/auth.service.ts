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


// ======================================
// ROLE CONSTANT
// ======================================

const ROLE = {
  ADMIN: 1,
  REKRUTMEN_ADMIN: 2,
  EMPLOYEE: 3,
  PRESENSI_ADMIN: 4,
};


// ======================================
// ROLE MAPPING
// ======================================

const mapRole = (
  role_id: number
) => {

  switch (role_id) {

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


// ======================================
// REGISTER
// ======================================

export const register = async (
  data: any
) => {

  const existing =
    await repo.findUserByEmail(
      data.email
    );

  if (existing) {
    throw new Error(
      "Email already used"
    );
  }

  const hashed =
    await hashPassword(
      data.password
    );

  const user =
    await repo.createUser({
      ...data,
      password: hashed,
    });

  return user;

};


// ======================================
// LOGIN
// ======================================

export const login = async (
  email: string,
  password: string
) => {

  const user =
    await repo.findUserByEmail(
      email
    );

  if (!user) {
    throw new Error(
      "User not found"
    );
  }

  const match =
    await comparePassword(
      password,
      user.password
    );

  if (!match) {
    throw new Error(
      "Wrong password"
    );
  }


  const role =
    mapRole(
      user.role_id
    );


  // ================================
  // DEBUG ROLE
  // ================================

  console.log(
    "=== LOGIN ROLE DEBUG ==="
  );

  console.log({
    userId: user.id,
    email: user.email,
    roleId: user.role_id,
    mappedRole: role,
  });


  // ================================
  // BELUM SETUP 2FA
  // ================================

  if (
    !user.two_factor_enabled
  ) {

    const data =
      await generate2FASecret(
        user.email
      );

    await repo.save2FASecret(
      user.uuid,
      data.secret
    );

    console.log(
      "LOGIN UUID:",
      user.uuid
    );

    return {

      success: true,

      requires2FASetup: true,

      qrCode:
        data.qrCode,

      userUuid:
        user.uuid,

    };

  }


  // ================================
  // SUDAH SETUP 2FA
  // ================================

  console.log(
    "LOGIN UUID:",
    user.uuid
  );

  return {

    success: true,

    requiresOTP: true,

    userUuid:
      user.uuid,

  };

};


// ======================================
// LOGIN WITH GOOGLE
// ======================================

export const loginWithGoogle = async (
  googleToken: string
) => {

  const googlePayload =
    await verifyGoogleToken(
      googleToken
    );

  if (
    !googlePayload.email
  ) {
    throw new Error(
      "Google email not found"
    );
  }


  let user =
    await repo.findUserByEmail(
      googlePayload.email
    );


  // ================================
  // AUTO CREATE USER GOOGLE
  // ================================

  if (!user) {

    user =
      await repo.createGoogleUser({

        name:
          googlePayload.name ||
          "Google User",

        email:
          googlePayload.email,

        avatar:
          googlePayload.picture,

        // DEFAULT EMPLOYEE
        role_id:
          ROLE.EMPLOYEE,

      });

  }


  const role =
    mapRole(
      user.role_id
    );


  // ================================
  // DEBUG ROLE
  // ================================

  console.log(
    "=== GOOGLE ROLE DEBUG ==="
  );

  console.log({

    userId:
      user.id,

    email:
      user.email,

    roleId:
      user.role_id,

    mappedRole:
      role,

  });


  const token =
    generateToken({

      id:
        user.uuid,

      role,

    });


  return {

    success: true,

    user: {

      id:
        user.id,

      name:
        user.name,

      email:
        user.email,

      role,

      avatar:
        user.avatar ||
        null,

    },

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

  const user =
    await repo.findUserByUuid(
      userUuid
    );


  if (!user) {

    throw new Error(
      "User tidak ditemukan"
    );

  }


  // ================================
  // VERIFY OTP
  // ================================

  const verified =
    verify2FACode(
      user.two_factor_secret,
      otp
    );


  if (!verified) {

    throw new Error(
      "OTP tidak valid"
    );

  }


  // ================================
  // ENABLE 2FA
  // ================================

  if (
    !user.two_factor_enabled
  ) {

    await repo.enable2FA(
      user.uuid
    );

  }


  // ================================
  // ROLE
  // ================================

  const role =
    mapRole(
      user.role_id
    );


  // ================================
  // DEBUG ROLE
  // ================================

  console.log(
    "=== OTP ROLE DEBUG ==="
  );

  console.log({

    userId:
      user.id,

    email:
      user.email,

    roleId:
      user.role_id,

    mappedRole:
      role,

  });


  // ================================
  // GENERATE TOKEN
  // ================================

  const token =
    generateToken({

      id:
        user.uuid,

      role,

    });


  // ================================
  // RESPONSE
  // ================================

  return {

    success: true,

    user: {

      id:
        user.id,

      name:
        user.name,

      email:
        user.email,

      role,

    },

    token,

  };

};