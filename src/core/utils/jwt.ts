
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

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
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: "HS256",
  });
};

export const verifyToken = (
  token: string
): JwtPayload | string => {
  if (!token || typeof token !== "string") {
    throw new Error("Token JWT tidak tersedia.");
  }

  return jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });
};
