
import {
  Router,
} from "express";

import employeeController
  from "../controllers/employee.controller";


// ============================================================
// ROUTER
// ============================================================

const router =
  Router();


// ============================================================
// GET ALL
//
// GET /api/hris/employees
// ============================================================

router.get(
  "/",
  employeeController.getAll.bind(
    employeeController
  )
);


// ============================================================
// UPDATE
//
// PATCH /api/hris/employees/:id
// ============================================================

router.patch(
  "/:id",
  employeeController.update.bind(
    employeeController
  )
);


// ============================================================
// GET BY ID
//
// GET /api/hris/employees/:id
//
// PENTING:
// Route ini tetap setelah "/".
// Tidak ada lagi "/me" karena pengecekan
// employee aktif sudah dipindahkan ke Settings.
// ============================================================

router.get(
  "/:id",
  employeeController.getById.bind(
    employeeController
  )
);


// ============================================================
// EXPORT
// ============================================================

export default router;
