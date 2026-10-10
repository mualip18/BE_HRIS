import { Router } from "express";

import presensiController from "../controllers/presensi.controller";
import faceController from "../controllers/face.controller";
import cutiController from "../controllers/cuti.controller";
import lokasiController from "../controllers/lokasi.controller";
import shiftController from "../controllers/shift.controller";

import faceUpload from "../middlewares/faceUpload";
import { authenticate } from "../../../core/middlewares/auth.middleware";

const router = Router();

// ============================================================
// PRESENSI — USER
// ============================================================
router.get("/me", authenticate, presensiController.getMyStatus.bind(presensiController));
router.get("/history", authenticate, presensiController.getHistory.bind(presensiController));
router.get("/shifts", authenticate, presensiController.getShifts.bind(presensiController));

// ============================================================
// FACE
// ============================================================
router.get("/face/status", authenticate, faceController.getStatus.bind(faceController));
router.post("/face/register", authenticate, faceUpload.single("foto"), faceController.register.bind(faceController));
router.post("/face/verify", authenticate, faceUpload.single("foto"), faceController.verify.bind(faceController));

// ============================================================
// CHECK IN / OUT
// ============================================================
router.post("/check-in", authenticate, faceUpload.single("foto"), presensiController.checkIn.bind(presensiController));
router.post("/check-out", authenticate, faceUpload.single("foto"), presensiController.checkOut.bind(presensiController));

// ============================================================
// REKAP
// ============================================================
router.get("/rekap", authenticate, presensiController.getRekap.bind(presensiController));
router.get("/rekap/bulanan", authenticate, presensiController.getRekapBulanan.bind(presensiController));

// ============================================================
// LOKASI — CRUD
// ============================================================
router.get("/locations", authenticate, lokasiController.getAll.bind(lokasiController));
router.get("/locations/:id", authenticate, lokasiController.getById.bind(lokasiController));
router.post("/locations", authenticate, lokasiController.create.bind(lokasiController));
router.put("/locations/:id", authenticate, lokasiController.update.bind(lokasiController));
router.delete("/locations/:id", authenticate, lokasiController.remove.bind(lokasiController));

// ============================================================
// LOKASI — ASSIGNMENT
// ============================================================
router.get("/locations/:id/employees", authenticate, lokasiController.getAssignedEmployees.bind(lokasiController));
router.put("/locations/:id/employees", authenticate, lokasiController.setAssignedEmployees.bind(lokasiController));

router.get("/employees/:id/locations", authenticate, lokasiController.getEmployeeLocations.bind(lokasiController));
router.put("/employees/:id/locations", authenticate, lokasiController.setEmployeeLocations.bind(lokasiController));

// ============================================================
// SHIFT CRUD
// ============================================================
router.get("/shifts/all", authenticate, shiftController.getAll.bind(shiftController));
router.post("/shifts", authenticate, shiftController.create.bind(shiftController));
router.put("/shifts/:id", authenticate, shiftController.update.bind(shiftController));
router.delete("/shifts/:id", authenticate, shiftController.remove.bind(shiftController));

// ============================================================
// SHIFT ASSIGNMENT
// ============================================================
router.get("/shift-assignments", authenticate, shiftController.getAssignments.bind(shiftController));
router.post("/shift-assignments", authenticate, shiftController.assign.bind(shiftController));

// ✅ Status-only (di atas /:id untuk safety)
router.put("/shift-assignments/:id/status", authenticate, shiftController.updateAssignment.bind(shiftController));

// ✅ Full update
router.put("/shift-assignments/:id", authenticate, shiftController.updateAssignmentFull.bind(shiftController));

// ============================================================
// CUTI
// ============================================================
router.get("/cuti/types", authenticate, cutiController.getTypes.bind(cutiController));
router.post("/cuti/types", authenticate, cutiController.createType.bind(cutiController));
router.put("/cuti/types/:id", authenticate, cutiController.updateType.bind(cutiController));
router.delete("/cuti/types/:id", authenticate, cutiController.deleteType.bind(cutiController));

router.get("/cuti/employees", authenticate, cutiController.getEmployees.bind(cutiController));

router.get("/cuti/balances", authenticate, cutiController.getBalances.bind(cutiController));
router.put("/cuti/balances", authenticate, cutiController.updateBalance.bind(cutiController));

router.get("/cuti/requests", authenticate, cutiController.getRequests.bind(cutiController));
router.post("/cuti/requests", authenticate, cutiController.createRequest.bind(cutiController));
router.put("/cuti/requests/:id/status", authenticate, cutiController.updateStatus.bind(cutiController));

export default router;