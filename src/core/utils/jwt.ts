
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

/**
 * JWT configuration
 * JWT_SECRET wajib tersedia di environment Railway atau .env lokal.
 * Jangan menggunakan secret default di production.
 */

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "[JWT CONFIG] JWT_SECRET tidak ditemukan. " +
      "Tambahkan JWT_SECRET pada Variables service backend Railway."
    );
  }

  if (secret.length < 32) {
    throw new Error(
      "[JWT CONFIG] JWT_SECRET minimal harus 32 karakter."
    );
  }

  return secret;
};

const JWT_EXPIRES_IN: SignOptions["expiresIn"] = "1d";

export const generateToken = (payload: object): string => {
  const secret = getJwtSecret();

  return jwt.sign(payload, secret, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  });
};

export const verifyToken = (token: string): JwtPayload | string => {
  if (!token || typeof token !== "string") {
    throw new Error("Token JWT tidak tersedia.");
  }

  const secret = getJwtSecret();

  return jwt.verify(token, secret, {
    algorithms: ["HS256"],
  });
};
