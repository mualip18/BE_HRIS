
import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./modules/auth/routes/auth.routes";
import rekrutmenRoutes from "./modules/rekrutmen/routes/rekrutmen.routes";
import profileRoutes from "./modules/profile/routes/profile.routes";
import applyRoutes from "./modules/rekrutmen/routes/apply.routes";
import testRoutes from "./modules/rekrutmen/test/routes/test.routes";
import candidateTestRoutes from "./modules/rekrutmen/test/routes/candidate.routes";

import { authMiddleware } from "./core/middlewares/auth.middleware";
import { roleMiddleware } from "./core/middlewares/role.middleware";

import candidateRoutes from "./modules/rekrutmen/routes/candidate.routes";
import userMessageRoutes from "./modules/rekrutmen/routes/userMessage.routes";
import employeeRoutes from "./modules/hris/routes/employee.routes";

import whatsappRoutes from "./modules/notifications/whatsapp/whatsapp.routes";
import presensiRoutes from "./modules/presensi/routes/presensi.routes";
import settingsRoutes from "./modules/settings/routes/settings.routes";

import { ROLES } from "./core/constants/roles";
import { env } from "./config/env";

const app = express();

/* ================================================================
   CORS CONFIGURATION
================================================================ */

const defaultAllowedOrigins = [
  "https://kariryadin.netlify.app",
  "http://localhost:5173",
  "http://localhost:5174",
];

const configuredOrigins = (env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([
    ...defaultAllowedOrigins,
    ...configuredOrigins,
  ]),
];

console.log("[CORS] Allowed origins:", allowedOrigins);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Request server-to-server atau tanpa Origin.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/+$/, "");

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn("[CORS BLOCKED]", origin);

    return callback(null, false);
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  optionsSuccessStatus: 204,
};

// CORS harus dipasang sebelum seluruh route.
app.use(cors(corsOptions));

// Penanganan eksplisit request preflight.
app.options("*", cors(corsOptions));

/* ================================================================
   REQUEST LOG
================================================================ */

app.use((req, _res, next) => {
  console.log(
    "[REQUEST]",
    req.method,
    req.originalUrl,
    "ORIGIN:",
    req.headers.origin
  );

  next();
});

/* ================================================================
   BODY PARSER
================================================================ */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* ================================================================
   STATIC FILES
================================================================ */

app.use(
  "/uploads",
  express.static(
    path.join(process.cwd(), env.UPLOAD_DIR)
  )
);

/* ================================================================
   HEALTH CHECK
================================================================ */

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "BEHRIS API",
    status: "Running",
    version: "1.0.0",
  });
});

/* ================================================================
   AUTH
================================================================ */

app.use("/api/auth", authRoutes);

/* ================================================================
   REKRUTMEN
================================================================ */

app.use("/api/rekrutmen", rekrutmenRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/apply", applyRoutes);

app.use(
  "/api/rekrutmen/candidates",
  candidateRoutes
);

app.use(
  "/api/rekrutmen/messages",
  userMessageRoutes
);

app.use("/api/tests", testRoutes);

app.use("/api/candidate", candidateTestRoutes);

/* ================================================================
   HRIS EMPLOYEES
================================================================ */

app.use(
  "/api/hris/employees",
  employeeRoutes
);

/* ================================================================
   WHATSAPP
================================================================ */

app.use("/api/whatsapp", whatsappRoutes);

/* ================================================================
   PRESENSI
================================================================ */

app.use("/api/presensi", presensiRoutes);

/* ================================================================
   SETTINGS
================================================================ */

app.use("/api/settings", settingsRoutes);

/* ================================================================
   TEST AUTH
================================================================ */

app.get(
  "/api/test",
  authMiddleware,
  (req: any, res) => {
    res.json({
      success: true,
      message: "Protected route success",
      user: req.user,
    });
  }
);

/* ================================================================
   ADMIN
================================================================ */

app.get(
  "/api/admin",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  (_req, res) => {
    res.json({
      success: true,
      message: "Admin only",
    });
  }
);

/* ================================================================
   HR / REKRUTMEN ADMIN
================================================================ */

app.get(
  "/api/hr",
  authMiddleware,
  roleMiddleware([ROLES.REKRUTMEN_ADMIN]),
  (_req, res) => {
    res.json({
      success: true,
      message: "Rekrutmen Admin only",
    });
  }
);

/* ================================================================
   404 HANDLER
================================================================ */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route tidak ditemukan",
    path: req.originalUrl,
    method: req.method,
  });
});

/* ================================================================
   EXPORT APP
================================================================ */

export default app;
