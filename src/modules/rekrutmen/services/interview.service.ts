import db from "../../../config/db";

import interviewRepository from "../repositories/interview.repository";

import {
  AssessmentType,
  CreateInterviewPayload,
  CreateInterviewRequest,
  UpdateInterviewPayload,
  UpdateInterviewRequest,
  SaveInterviewAssessmentRequest,
} from "../types/interview.types";

function normalizeEvaluationData(raw: any) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

function normalizeInterview(row: any) {
  if (!row) return null;

  const evaluationData = normalizeEvaluationData(row.evaluation_data);

  return {
    id: row.id,
    applyId: row.apply_id,
    templateId: row.template_id,
    tanggal: row.interview_date,
    jam: row.interview_time,
    duration: row.duration !== null ? Number(row.duration) : null,
    method: row.method,
    lokasi: row.location,
    meetingLink: row.meeting_link,
    interviewerId: row.interviewer_id,
    interviewerName: row.interviewer_name,
    interviewerPosition: row.interviewer_position,
    status: row.status,
    decision: row.decision,
    totalScore: row.total_score !== null ? Number(row.total_score) : null,
    notes: row.notes,
    evaluationData,
    assessmentResults: evaluationData.assessments ?? {},
    employeeStatus: evaluationData.employeeStatus ?? null,
    candidateName: row.candidate_name,
    email: row.candidate_email,
    phone: row.candidate_phone,
    posisi: row.candidate_position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    template: row.template_id
      ? {
          id: row.template_id,
          name: row.template_name,
          type: row.template_type,
        }
      : null,
  };
}

async function resolveTemplateId(templateType: string): Promise<string> {
  const normalized = String(templateType ?? "").trim().toLowerCase();
  if (!normalized) throw new Error("Template interview wajib dipilih.");

  const result = await db.query(
    `
      SELECT id FROM interview_templates
      WHERE LOWER(type) = $1 AND LOWER(status) = 'active'
      ORDER BY created_at DESC LIMIT 1
    `,
    [normalized]
  );
  if (!result.rows.length) {
    throw new Error(`Template interview "${templateType}" tidak ditemukan atau tidak aktif.`);
  }
  return result.rows[0].id;
}

async function getAll() {
  const rows = await interviewRepository.findAll();
  return rows.map(normalizeInterview);
}

async function getResults() {
  const rows = await interviewRepository.findResults();
  return rows.map(normalizeInterview);
}

async function getById(id: string) {
  const row = await interviewRepository.findById(id);
  return normalizeInterview(row);
}

async function getByApplyId(applyId: number) {
  const row = await interviewRepository.findByApplyId(applyId);
  return normalizeInterview(row);
}

async function getByInterviewerId(interviewerId: string) {
  const rows = await interviewRepository.findByInterviewerId(interviewerId);
  return rows.map(normalizeInterview);
}

function validateCreatePayload(payload: CreateInterviewRequest) {
  if (
    payload.applyId === null ||
    payload.applyId === undefined ||
    !Number.isInteger(Number(payload.applyId)) ||
    Number(payload.applyId) <= 0
  ) {
    throw new Error("applyId wajib diisi dan harus valid.");
  }
  if (!payload.templateId) throw new Error("Template interview wajib dipilih.");
  if (!payload.tanggal) throw new Error("Tanggal interview wajib diisi.");
  if (!payload.jam) throw new Error("Jam interview wajib diisi.");
  if (!payload.interviewerName || !String(payload.interviewerName).trim()) {
    throw new Error("Nama pewawancara wajib diisi.");
  }
}

async function create(payload: CreateInterviewRequest) {
  validateCreatePayload(payload);

  const applyId = Number(payload.applyId);

  const applyResult = await db.query(
    `SELECT id FROM job_applies WHERE id = $1 LIMIT 1`,
    [applyId]
  );
  if (!applyResult.rows.length) throw new Error("Data lamaran tidak ditemukan.");

  const existing = await interviewRepository.findByApplyId(applyId);
  if (existing) {
    const error: any = new Error("Kandidat ini sudah memiliki jadwal interview.");
    error.code = "INTERVIEW_ALREADY_EXISTS";
    throw error;
  }

  const resolvedTemplateId = await resolveTemplateId(String(payload.templateId));

  const createPayload: CreateInterviewPayload = {
    applyId,
    templateId: resolvedTemplateId,
    tanggal: payload.tanggal,
    jam: payload.jam,
    duration:
      payload.duration !== undefined && payload.duration !== null
        ? Number(payload.duration)
        : 60,
    method: payload.method?.trim() || null,
    interviewerId: payload.interviewerId || null,
    location: payload.location?.trim() || null,
    meetingLink: payload.meetingLink?.trim() || null,
    interviewerName: payload.interviewerName?.trim() || null,
    interviewerPosition: payload.interviewerPosition?.trim() || null,
    status: payload.status || "scheduled",
    decision: null,
    totalScore: null,
    notes: payload.notes?.trim() || null,
    evaluationData: payload.evaluationData ?? {},
  };

  const row = await interviewRepository.create(createPayload);
  return normalizeInterview(row);
}

function validateUpdatePayload(payload: UpdateInterviewRequest) {
  if (
    payload.applyId !== undefined &&
    (!Number.isInteger(Number(payload.applyId)) || Number(payload.applyId) <= 0)
  ) {
    throw new Error("applyId tidak valid.");
  }
  if (payload.templateId !== undefined && !payload.templateId) {
    throw new Error("Template interview tidak valid.");
  }
  if (payload.tanggal !== undefined && !payload.tanggal) {
    throw new Error("Tanggal interview tidak boleh kosong.");
  }
  if (payload.jam !== undefined && !payload.jam) {
    throw new Error("Jam interview tidak boleh kosong.");
  }
  if (payload.totalScore !== undefined && payload.totalScore !== null) {
    const score = Number(payload.totalScore);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      throw new Error("Nilai interview harus berada di antara 0 sampai 100.");
    }
  }
  if (payload.decision !== undefined && payload.decision !== null) {
    if (!["lulus", "tidak_lulus"].includes(payload.decision)) {
      throw new Error("Keputusan interview tidak valid.");
    }
  }
}

async function update(id: string, payload: UpdateInterviewRequest) {
  const existing = await interviewRepository.findById(id);
  if (!existing) throw new Error("Jadwal interview tidak ditemukan.");

  validateUpdatePayload(payload);

  let applyId: number | undefined;
  if (payload.applyId !== undefined) applyId = Number(payload.applyId);

  if (applyId !== undefined && applyId !== Number(existing.apply_id)) {
    const duplicate = await interviewRepository.findByApplyId(applyId);
    if (duplicate && duplicate.id !== id) {
      const error: any = new Error("Kandidat tersebut sudah memiliki jadwal interview.");
      error.code = "INTERVIEW_ALREADY_EXISTS";
      throw error;
    }
  }

  let resolvedTemplateId: string | undefined;
  if (payload.templateId !== undefined) {
    resolvedTemplateId = await resolveTemplateId(String(payload.templateId));
  }

  const updatePayload: UpdateInterviewPayload = {
    applyId,
    templateId: resolvedTemplateId,
    tanggal: payload.tanggal,
    jam: payload.jam,
    duration:
      payload.duration !== undefined && payload.duration !== null
        ? Number(payload.duration)
        : undefined,
    method:
      payload.method !== undefined ? payload.method?.trim() || null : undefined,
    location:
      payload.location !== undefined ? payload.location?.trim() || null : undefined,
    meetingLink:
      payload.meetingLink !== undefined
        ? payload.meetingLink?.trim() || null
        : undefined,
    interviewerId:
      payload.interviewerId !== undefined ? payload.interviewerId || null : undefined,
    interviewerName:
      payload.interviewerName !== undefined
        ? payload.interviewerName?.trim() || null
        : undefined,
    interviewerPosition:
      payload.interviewerPosition !== undefined
        ? payload.interviewerPosition?.trim() || null
        : undefined,
    status: payload.status,
    decision: payload.decision !== undefined ? payload.decision : undefined,
    totalScore:
      payload.totalScore !== undefined ? payload.totalScore : undefined,
    notes:
      payload.notes !== undefined ? payload.notes?.trim() || null : undefined,
    evaluationData:
      payload.evaluationData !== undefined ? payload.evaluationData : undefined,
  };

  const row = await interviewRepository.update(id, updatePayload);
  return normalizeInterview(row);
}

async function saveAssessment(id: string, payload: SaveInterviewAssessmentRequest) {
  const validTypes: AssessmentType[] = [
    "behavioral_admin",
    "hr_admin",
    "behavioral_guru",
    "hr_guru",
    "microteaching",
  ];

  if (!validTypes.includes(payload.assessmentType)) {
    throw new Error("Jenis interview tidak valid.");
  }

  const score = Number(payload.totalScore);
  if (Number.isNaN(score) || score < 0 || score > 100) {
    throw new Error("Nilai akhir harus berada pada 0 sampai 100.");
  }

  if (
    payload.decision !== undefined &&
    payload.decision !== null &&
    !["lulus", "tidak_lulus"].includes(payload.decision)
  ) {
    throw new Error("Keputusan interview tidak valid.");
  }

  const existing = await interviewRepository.findById(id);
  if (!existing) throw new Error("Data interview tidak ditemukan.");

  const assessmentData = {
    ...(payload.evaluationData ?? {}),
    assessmentType: payload.assessmentType,
    totalScore: Number(score.toFixed(2)),
    decision: payload.decision ?? null,
    recommendation: payload.recommendation?.trim() || null,
    notes: payload.notes?.trim() || null,
    savedAt: new Date().toISOString(),
  };

  const row = await interviewRepository.saveAssessment(
    id,
    payload.assessmentType,
    assessmentData
  );

  return normalizeInterview(row);
}

async function saveEmployeeStatus(id: string, employeeStatus: string | null) {
  const valid = [null, "", "diterima", "gagal"];
  const normalized =
    employeeStatus === "" || employeeStatus === undefined
      ? null
      : employeeStatus;

  if (!valid.includes(normalized)) {
    throw new Error("Status karyawan tidak valid.");
  }

  const existing = await interviewRepository.findById(id);
  if (!existing) throw new Error("Data interview tidak ditemukan.");

  const row = await interviewRepository.saveEmployeeStatus(id, normalized);
  return normalizeInterview(row);
}

async function remove(id: string) {
  const existing = await interviewRepository.findById(id);
  if (!existing) throw new Error("Jadwal interview tidak ditemukan.");
  await interviewRepository.remove(id);
  return { id, deleted: true };
}

export default {
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
};