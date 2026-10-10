import { Request, Response } from "express";

import interviewService from "../services/interview.service";

function errorMessage(error: any) {
  return error?.message || "Terjadi kesalahan pada server.";
}

export async function getAll(req: Request, res: Response) {
  try {
    const data = await interviewService.getAll();
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: errorMessage(error) });
  }
}

export async function getResults(req: Request, res: Response) {
  try {
    const data = await interviewService.getResults();
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: errorMessage(error) });
  }
}

export async function getById(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const data = await interviewService.getById(id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Data interview tidak ditemukan.",
      });
    }
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: errorMessage(error) });
  }
}

export async function getByApplyId(req: Request, res: Response) {
  try {
    const applyId = Number(req.params.applyId);
    const data = await interviewService.getByApplyId(applyId);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Data interview tidak ditemukan.",
      });
    }
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: errorMessage(error) });
  }
}

export async function getByInterviewerId(req: Request, res: Response) {
  try {
    const interviewerId = String(req.params.interviewerId);
    const data = await interviewService.getByInterviewerId(interviewerId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: errorMessage(error) });
  }
}

export async function create(req: Request, res: Response) {
  try {
    const data = await interviewService.create(req.body);
    return res.status(201).json({
      success: true,
      message: "Jadwal interview berhasil dibuat.",
      data,
    });
  } catch (error: any) {
    const status = error?.code === "INTERVIEW_ALREADY_EXISTS" ? 409 : 400;
    return res.status(status).json({ success: false, message: errorMessage(error) });
  }
}

export async function update(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const data = await interviewService.update(id, req.body);
    return res.json({
      success: true,
      message: "Data interview berhasil diperbarui.",
      data,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
}

export async function saveAssessment(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const data = await interviewService.saveAssessment(id, req.body);
    return res.json({
      success: true,
      message: "Hasil interview berhasil disimpan.",
      data,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
}

export async function saveEmployeeStatus(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const { employeeStatus } = req.body ?? {};
    const data = await interviewService.saveEmployeeStatus(
      id,
      employeeStatus ?? null
    );
    return res.json({
      success: true,
      message: "Status akhir kandidat berhasil disimpan.",
      data,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const data = await interviewService.remove(id);
    return res.json({
      success: true,
      message: "Jadwal interview berhasil dihapus.",
      data,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: errorMessage(error) });
  }
}