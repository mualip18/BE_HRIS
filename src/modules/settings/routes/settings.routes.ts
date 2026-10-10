import {
  Router,
} from "express";

import settingsController
  from "../controllers/settings.controller";

import {
  authenticate,
} from "../../../core/middlewares/auth.middleware";

const router =
  Router();

/* ================================================================
   GET MENU USER LOGIN

   GET /api/settings/menu

   HARUS LOGIN
================================================================ */

router.get(
  "/menu",
  authenticate,
  settingsController.getMenu.bind(
    settingsController
  )
);

export default router;