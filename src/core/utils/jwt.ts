
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const secret = process.env.JWT_SECRET;

if (!secret || secret.trim().length < 32) {
  throw new Error(
    "JWT_SECRET wajib diatur dan minimal 32 karakter"
  );
}

export interface AuthTokenPayload extends JwtPayload {
  id: string | number;
  role: string;
}

export const generateToken = (
  payload: AuthTokenPayload
): string => {
  return jwt.sign(
    {
      id: payload.id,
      role: payload.role,
    },
    secret,
    {
      expiresIn: "1d",
    } as SignOptions
  );
};

export const verifyToken = (
  token: string
): AuthTokenPayload => {
  const decoded = jwt.verify(token, secret);

  if (
    typeof decoded === "string" ||
    !decoded.id ||
    typeof decoded.role !== "string"
  ) {
    throw new Error("Invalid authentication token");
  }

  return decoded as AuthTokenPayload;
};
