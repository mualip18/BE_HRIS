
import { Request, Response } from "express";
import * as service from "../services/auth.service";

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await service.register(req.body);
    return res.status(201).json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "";

    if (message.includes("already") || message.includes("digunakan")) {
      return res.status(409).json({
        success: false,
        message: "Email sudah digunakan",
      });
    }

    if (
      message.includes("wajib") ||
      message.includes("minimal")
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    console.error("[REGISTER ERROR]", message);

    return res.status(500).json({
      success: false,
      message: "Registrasi gagal. Silakan coba lagi.",
    });
  }
};

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await service.login(
      req.body.email,
      req.body.password
    );

    return res.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "";

    if (
      message === "Email atau password salah" ||
      message === "Akun ini menggunakan login Google"
    ) {
      return res.status(401).json({
        success: false,
        message,
      });
    }

    if (message.includes("wajib")) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    console.error("[LOGIN ERROR]", message);

    return res.status(500).json({
      success: false,
      message: "Login gagal. Silakan coba lagi.",
    });
  }
};

export const googleLogin = async (
  req: Request,
  res: Response
) => {
  try {
    const { token } = req.body ?? {};

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Google access token wajib diisi",
      });
    }

    const result = await service.loginWithGoogle(token);

    return res.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "";

    console.error("[GOOGLE LOGIN ERROR]", message);

    if (message.includes("token verification failed")) {
      return res.status(401).json({
        success: false,
        message: "Token Google tidak valid atau kedaluwarsa",
      });
    }

    if (message.includes("Email not verified")) {
      return res.status(403).json({
        success: false,
        message: "Email Google belum terverifikasi",
      });
    }

    if (
      message.includes("Role akun belum dikonfigurasi") ||
      message.includes("Data akun belum lengkap")
    ) {
      return res.status(403).json({
        success: false,
        message,
      });
    }

    if (
      message.includes("Google access token") ||
      message.includes("Google email")
    ) {
      return res.status(401).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Login Google gagal. Silakan coba lagi.",
    });
  }
};

export const verifyOTP = async (
  req: Request,
  res: Response
) => {
  try {
    const { userUuid, otp } = req.body ?? {};

    const result = await service.verifyOTP(
      userUuid,
      otp
    );

    return res.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "";

    if (
      message.includes("OTP") ||
      message.includes("User") ||
      message.includes("2FA") ||
      message.includes("UUID")
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    console.error("[VERIFY OTP ERROR]", message);

    return res.status(500).json({
      success: false,
      message: "Verifikasi OTP gagal",
    });
  }
};
