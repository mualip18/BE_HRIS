import type {
  Request,
  Response,
} from "express";

import settingsService
  from "../services/settings.service";

/* ================================================================
   SETTINGS CONTROLLER
================================================================ */

class SettingsController {

  /* ==============================================================
     GET MENU USER LOGIN

     GET /api/settings/menu
  ============================================================== */

  async getMenu(
    req: Request,
    res: Response
  ) {

    try {

      /*
       * authMiddleware memasukkan:
       *
       * req.user = {
       *   id: decoded.id,
       *   role: decoded.role
       * }
       *
       * decoded.id = users.uuid
       */

      const userUuid =
        (req as any).user?.id;

      console.log(
        "\n============================================================"
      );

      console.log(
        "[SETTINGS DEBUG] GET /settings/menu"
      );

      console.log(
        "JWT USER UUID:",
        userUuid
      );

      /* ========================================================
         VALIDASI USER
      ======================================================== */

      if (
        !userUuid ||
        typeof userUuid !==
          "string"
      ) {

        return res.status(
          401
        ).json({

          success:
            false,

          message:
            "User tidak terautentikasi",

        });
      }

      /* ========================================================
         GET MENU
      ======================================================== */

      const result =
        await settingsService.getUserMenu(
          userUuid
        );

      return res.json(
        result
      );

    } catch (error) {

      console.error(
        "GET settings menu error:",
        error
      );

      return res.status(
        500
      ).json({

        success:
          false,

        message:
          "Gagal mengambil pengaturan menu",

      });
    }
  }
}

export default new SettingsController();