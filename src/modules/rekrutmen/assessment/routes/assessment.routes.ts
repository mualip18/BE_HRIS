import { Router } from "express";

import {
  assessmentController,
} from "../controllers/assessment.controller";

import {
  assessmentScoringController,
} from "../controllers/assessmentScoring.controller";

import {
  authMiddleware,
} from "../../../../core/middlewares/auth.middleware";

import {
  roleMiddleware,
} from "../../../../core/middlewares/role.middleware";

const router = Router();

const adminRoles = [
  "admin",
  "hr",
  "rekrutmen_admin",
];

// =====================================================
// COMPONENTS
// =====================================================

router.get(
  "/components",
  authMiddleware,
  roleMiddleware(adminRoles),
  assessmentController
    .getComponents
    .bind(assessmentController)
);

router.get(
  "/components/:id",
  authMiddleware,
  roleMiddleware(adminRoles),
  assessmentController
    .getComponentById
    .bind(assessmentController)
);

router.post(
  "/components",
  authMiddleware,
  roleMiddleware([
    "rekrutmen_admin",
  ]),
  assessmentController
    .createComponent
    .bind(assessmentController)
);

router.put(
  "/components/:id",
  authMiddleware,
  roleMiddleware([
    "rekrutmen_admin",
  ]),
  assessmentController
    .updateComponent
    .bind(assessmentController)
);

router.patch(
  "/components/:id/toggle-active",
  authMiddleware,
  roleMiddleware([
    "rekrutmen_admin",
  ]),
  assessmentController
    .toggleComponent
    .bind(assessmentController)
);

// =====================================================
// SCORING CONFIGURATION
// =====================================================
//
// GET
// /api/rekrutmen/assessment/:testId/scoring
//
// Mengambil konfigurasi bobot scoring
// berdasarkan assessment/test.
//
// =====================================================

router.get(
  "/:testId/scoring",
  authMiddleware,
  roleMiddleware(adminRoles),
  assessmentScoringController
    .getConfig
    .bind(assessmentScoringController)
);

// =====================================================
// SAVE SCORING CONFIGURATION
// =====================================================
//
// PUT
// /api/rekrutmen/assessment/:testId/scoring
//
// Body:
//
// {
//   "components": [
//     {
//       "componentId": "UUID",
//       "weight": 50
//     },
//     {
//       "componentId": "UUID",
//       "weight": 30
//     },
//     {
//       "componentId": "UUID",
//       "weight": 20
//     }
//   ]
// }
//
// Total wajib 100%.
//
// =====================================================

router.put(
  "/:testId/scoring",
  authMiddleware,
  roleMiddleware(adminRoles),
  assessmentScoringController
    .saveConfig
    .bind(assessmentScoringController)
);

// =====================================================
// SCORES
// =====================================================

router.put(
  "/scores",
  authMiddleware,
  roleMiddleware(adminRoles),
  assessmentController
    .saveScore
    .bind(assessmentController)
);

// =====================================================
// RESULTS
// =====================================================

router.get(
  "/results",
  authMiddleware,
  roleMiddleware(adminRoles),
  assessmentController
    .getResults
    .bind(assessmentController)
);

// =====================================================
// SELECTION HISTORY
// =====================================================
//
// GET:
// /api/rekrutmen/assessment/history/:applyId
//
// =====================================================

router.get(
  "/history/:applyId",
  authMiddleware,
  roleMiddleware(adminRoles),
  assessmentController
    .getSelectionHistory
    .bind(assessmentController)
);

export default router;