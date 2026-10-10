import { Router } from "express";

import {
  getAll,
  getResults,
  getById,
  getByApplyId,
  getByInterviewerId,
  create,
  update,
  saveAssessment,
  saveEmployeeStatus,
  remove,
} from "../controllers/interview.controller";

const router = Router();

/* GET */
router.get("/", getAll);
router.get("/results", getResults);
router.get("/apply/:applyId", getByApplyId);
router.get("/interviewer/:interviewerId", getByInterviewerId);
router.get("/:id", getById);

/* POST */
router.post("/", create);

/* PUT */
router.put("/:id/assessment", saveAssessment);
router.put("/:id/employee-status", saveEmployeeStatus);
router.put("/:id", update);

/* DELETE */
router.delete("/:id", remove);

export default router;