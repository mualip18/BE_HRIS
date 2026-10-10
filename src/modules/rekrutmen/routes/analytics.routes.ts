import { Router } from "express";

import analyticsController from "../controllers/analytics.controller";

const router = Router();

router.get(
  "/analytics",
  analyticsController.getAnalytics
);

router.get(
  "/reports",
  analyticsController.getReport
);

export default router;