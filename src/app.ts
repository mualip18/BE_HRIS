
import express from "express";
import cors from "cors";
import path from "path";

import authRoutes from "./modules/auth/routes/auth.routes";

import rekrutmenRoutes
  from "./modules/rekrutmen/routes/rekrutmen.routes";

import profileRoutes
  from "./modules/profile/routes/profile.routes";

import applyRoutes
  from "./modules/rekrutmen/routes/apply.routes";

import testRoutes
  from "./modules/rekrutmen/test/routes/test.routes";

import candidateTestRoutes
  from "./modules/rekrutmen/test/routes/candidate.routes";

import {
  authMiddleware,
} from "./core/middlewares/auth.middleware";

import {
  roleMiddleware,
} from "./core/middlewares/role.middleware";

import candidateRoutes
  from "./modules/rekrutmen/routes/candidate.routes";

import userMessageRoutes
  from "./modules/rekrutmen/routes/userMessage.routes";

import employeeRoutes
  from "./modules/hris/routes/employee.routes";

/* ================================================================
   WHATSAPP
================================================================ */

import whatsappRoutes
  from "./modules/notifications/whatsapp/whatsapp.routes";

/* ================================================================
   PRESENSI
================================================================ */

import presensiRoutes
  from "./modules/presensi/routes/presensi.routes";

/* ================================================================
   SETTINGS
================================================================ */

import settingsRoutes
  from "./modules/settings/routes/settings.routes";

import {
  ROLES,
} from "./core/constants/roles";

/* ================================================================
   ENV
================================================================ */

import {
  env,
} from "./config/env";

/* ================================================================
   APP
================================================================ */

const app = express();

/* ================================================================
   DEBUG REQUEST
================================================================ */

app.use(
  (req, _res, next) => {
    console.log(
      "REQUEST:",
      req.method,
      req.originalUrl,
      "ORIGIN:",
      req.headers.origin
    );

    next();
  }
);

/* ================================================================
   CORS
================================================================ */

// Diambil dari env.ALLOWED_ORIGINS (dipisah koma).
// Fallback default tersedia di src/config/env.ts.

const allowedOrigins = env.ALLOWED_ORIGINS
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

console.log(
  "CORS ALLOWED ORIGINS:",
  allowedOrigins
);

const corsOptions = {
  origin: function (
    origin: any,
    callback: any
  ) {
    console.log(
      "CORS CHECK ORIGIN:",
      origin
    );

    // Izinkan request tanpa Origin, misalnya server-to-server.
    if (!origin) {
      return callback(
        null,
        true
      );
    }

    if (
      allowedOrigins.includes(origin)
    ) {
      console.log(
        "CORS ALLOWED:",
        origin
      );

      return callback(
        null,
        true
      );
    }

    console.log(
      "CORS BLOCKED:",
      origin
    );

    return callback(
      null,
      false
    );
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
};

/* ================================================================
   CORS MIDDLEWARE
================================================================ */

app.use(
  cors(corsOptions)
);

/* ================================================================
   PREFLIGHT
================================================================ */

app.options(
  "*",
  cors(corsOptions)
);

/* ================================================================
   BODY PARSER
================================================================ */

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* ================================================================
   STATIC FILE
================================================================ */

app.use(
  "/uploads",
  express.static(
    path.join(
      process.cwd(),
      env.UPLOAD_DIR
    )
  )
);

/* ================================================================
   ROOT
================================================================ */

app.get(
  "/",
  (_req, res) => {
    res.json({
      success: true,
      service: "BEHRIS API",
      status: "Running",
      database: "Connected",
      version: "1.0.0",
    });
  }
);

/* ================================================================
   ROUTES AUTH
================================================================ */

app.use(
  "/api/auth",
  authRoutes
);

/* ================================================================
   ROUTES REKRUTMEN
================================================================ */

app.use(
  "/api/rekrutmen",
  rekrutmenRoutes
);

app.use(
  "/api/profile",
  profileRoutes
);

app.use(
  "/api/apply",
  applyRoutes
);

app.use(
  "/api/rekrutmen/candidates",
  candidateRoutes
);

app.use(
  "/api/rekrutmen/messages",
  userMessageRoutes
);

app.use(
  "/api/tests",
  testRoutes
);

app.use(
  "/api/candidate",
  candidateTestRoutes
);

/* ================================================================
   HRIS
================================================================ */

// GET    /api/hris/employees
// GET    /api/hris/employees/me
// GET    /api/hris/employees/:id
// PATCH  /api/hris/employees/:id

app.use(
  "/api/hris/employees",
  employeeRoutes
);

/* ================================================================
   WHATSAPP FONNTE
================================================================ */

// POST /api/whatsapp/webhook?secret=...
// GET  /api/whatsapp/messages
// GET  /api/whatsapp/conversation/:phone
// POST /api/whatsapp/reply
//
// Webhook menerima pesan masuk dari Fonnte.
// Endpoint pesan dan balasan dilindungi autentikasi
// serta role admin/rekrutmen admin di whatsapp.routes.ts.

app.use(
  "/api/whatsapp",
  whatsappRoutes
);

/* ================================================================
   PRESENSI
================================================================ */

// GET  /api/presensi/me
// GET  /api/presensi/history
// GET  /api/presensi/shifts
//
// GET  /api/presensi/face/status
// POST /api/presensi/face/register
//
// POST /api/presensi/check-in
// POST /api/presensi/check-out

app.use(
  "/api/presensi",
  presensiRoutes
);

/* ================================================================
   SETTINGS
================================================================ */

// GET /api/settings/menu
//
// Endpoint ini menentukan menu sidebar berdasarkan
// user yang sedang login.

app.use(
  "/api/settings",
  settingsRoutes
);

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
  roleMiddleware([
    ROLES.ADMIN,
  ]),
  (_req, res) => {
    res.json({
      success: true,
      message: "Admin only",
    });
  }
);

/* ================================================================
   HR
================================================================ */

app.get(
  "/api/hr",
  authMiddleware,
  roleMiddleware([
    ROLES.REKRUTMEN_ADMIN,
  ]),
  (_req, res) => {
    res.json({
      success: true,
      message: "Rekrutmen Admin only",
    });
  }
);

/* ================================================================
   404
================================================================ */

// Semua route harus didaftarkan sebelum handler 404.

app.use(
  "*",
  (_req, res) => {
    res.status(404).json({
      success: false,
      message: "Route tidak ditemukan",
    });
  }
);

/* ================================================================
   EXPORT APP
================================================================ */

export default app;
