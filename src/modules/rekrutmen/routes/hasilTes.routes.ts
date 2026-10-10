import {
  Router,
} from "express";

import {
  hasilTesController,
} from "../controllers/hasilTes.controller";

const router = Router();

/**
 * GET
 * /api/rekrutmen/hasil-tes
 */
router.get(
  "/",
  hasilTesController.getAll.bind(
    hasilTesController
  )
);

/**
 * GET
 * /api/rekrutmen/hasil-tes/settings
 *
 * PENTING:
 * Route ini harus berada sebelum /:id
 */
router.get(
  "/settings",
  hasilTesController.getSettings.bind(
    hasilTesController
  )
);

/**
 * PUT
 * /api/rekrutmen/hasil-tes/settings/passing-score
 *
 * PENTING:
 * Route ini harus berada sebelum /:id
 */
router.put(
  "/settings/passing-score",
  hasilTesController.updatePassingScore.bind(
    hasilTesController
  )
);

/**
 * PUT
 * /api/rekrutmen/hasil-tes/applications/:applyId/decision
 *
 * Menyimpan keputusan manual/catatan tanpa mengubah
 * status utama assessment.
 *
 * - without_note -> catatan = NULL
 * - with_note    -> catatan wajib diisi
 *
 * PENTING:
 * Route ini harus berada sebelum /:id
 */
router.put(
  "/applications/:applyId/decision",
  hasilTesController.updateCandidateDecision.bind(
    hasilTesController
  )
);

/**
 * GET
 * /api/rekrutmen/hasil-tes/:id
 *
 * :id = test_attempts.id UUID
 */
router.get(
  "/:id",
  hasilTesController.getById.bind(
    hasilTesController
  )
);

/**
 * PUT
 * /api/rekrutmen/hasil-tes/:attemptId/questions/:questionId
 */
router.put(
  "/:attemptId/questions/:questionId",
  hasilTesController.updateNilai.bind(
    hasilTesController
  )
);

/**
 * DELETE
 * /api/rekrutmen/hasil-tes/:id
 */
router.delete(
  "/:id",
  hasilTesController.delete.bind(
    hasilTesController
  )
);

export default router;
