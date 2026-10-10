import db from "../../../config/db";

import {
  CreateInterviewPayload,
  UpdateInterviewPayload,
} from "../types/interview.types";

const BASE_SELECT = `
  SELECT
    i.id,
    i.apply_id,
    i.template_id,
    i.interview_date,
    i.interview_time,
    i.duration,
    i.method,
    i.interviewer_id,
    i.interviewer_name,
    i.interviewer_position,
    i.location,
    i.meeting_link,
    i.status,
    i.decision,
    i.total_score,
    i.notes,
    i.evaluation_data,
    i.created_at,
    i.updated_at,
    ja.nama_lengkap AS candidate_name,
    ja.email AS candidate_email,
    ja.no_hp AS candidate_phone,
    ja.posisi AS candidate_position,
    t.name AS template_name,
    t.type AS template_type
  FROM interviews i
  INNER JOIN job_applies ja ON ja.id = i.apply_id
  LEFT JOIN interview_templates t ON t.id = i.template_id
`;

function parseEvaluationData(
  raw: any
): Record<string, any> {
  if (!raw) return {};

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  return raw;
}

async function findAll() {
  const result = await db.query(`
    ${BASE_SELECT}
    ORDER BY
      i.interview_date ASC,
      i.interview_time ASC,
      i.created_at DESC
  `);

  return result.rows;
}

async function findResults() {
  const result = await db.query(`
    ${BASE_SELECT}
    WHERE i.id IS NOT NULL
    ORDER BY
      i.interview_date ASC,
      i.interview_time ASC,
      i.created_at DESC
  `);

  return result.rows;
}

async function findById(
  id: string
) {
  const result = await db.query(
    `${BASE_SELECT} WHERE i.id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
}

async function findByApplyId(
  applyId: number
) {
  const result = await db.query(
    `
      ${BASE_SELECT}
      WHERE i.apply_id = $1
      ORDER BY i.created_at DESC
      LIMIT 1
    `,
    [applyId]
  );

  return result.rows[0] ?? null;
}

async function findByInterviewerId(
  interviewerId: string
) {
  const result = await db.query(
    `
      ${BASE_SELECT}
      WHERE i.interviewer_id = $1
      ORDER BY
        i.interview_date ASC,
        i.interview_time ASC
    `,
    [interviewerId]
  );

  return result.rows;
}

async function create(
  payload: CreateInterviewPayload
) {
  const result = await db.query(
    `
      INSERT INTO interviews (
        apply_id,
        template_id,
        interview_date,
        interview_time,
        duration,
        method,
        interviewer_id,
        interviewer_name,
        interviewer_position,
        location,
        meeting_link,
        status,
        decision,
        total_score,
        notes,
        evaluation_data
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16
      )
      RETURNING id
    `,
    [
      payload.applyId,
      payload.templateId ?? null,
      payload.tanggal,
      payload.jam,
      payload.duration ?? null,
      payload.method ?? null,
      payload.interviewerId ?? null,
      payload.interviewerName ?? null,
      payload.interviewerPosition ?? null,
      payload.location ?? null,
      payload.meetingLink ?? null,
      payload.status ?? "scheduled",
      payload.decision ?? null,
      payload.totalScore ?? null,
      payload.notes ?? null,
      payload.evaluationData ?? {},
    ]
  );

  return findById(
    result.rows[0].id
  );
}

async function update(
  id: string,
  payload: UpdateInterviewPayload
) {
  const result = await db.query(
    `
      UPDATE interviews
      SET
        apply_id = COALESCE(
          $2,
          apply_id
        ),

        template_id = COALESCE(
          $3,
          template_id
        ),

        interview_date = COALESCE(
          $4,
          interview_date
        ),

        interview_time = COALESCE(
          $5,
          interview_time
        ),

        duration = COALESCE(
          $6,
          duration
        ),

        method = COALESCE(
          $7,
          method
        ),

        interviewer_id = COALESCE(
          $8,
          interviewer_id
        ),

        interviewer_name = COALESCE(
          $9,
          interviewer_name
        ),

        interviewer_position = COALESCE(
          $10,
          interviewer_position
        ),

        location = COALESCE(
          $11,
          location
        ),

        meeting_link = COALESCE(
          $12,
          meeting_link
        ),

        status = COALESCE(
          $13,
          status
        ),

        decision = COALESCE(
          $14,
          decision
        ),

        total_score = COALESCE(
          $15,
          total_score
        ),

        notes = COALESCE(
          $16,
          notes
        ),

        evaluation_data = COALESCE(
          $17,
          evaluation_data
        ),

        updated_at = NOW()

      WHERE id = $1

      RETURNING id
    `,
    [
      id,
      payload.applyId ?? null,
      payload.templateId ?? null,
      payload.tanggal ?? null,
      payload.jam ?? null,
      payload.duration ?? null,
      payload.method ?? null,
      payload.interviewerId ?? null,
      payload.interviewerName ?? null,
      payload.interviewerPosition ?? null,
      payload.location ?? null,
      payload.meetingLink ?? null,
      payload.status ?? null,
      payload.decision ?? null,
      payload.totalScore ?? null,
      payload.notes ?? null,
      payload.evaluationData ?? null,
    ]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findById(
    result.rows[0].id
  );
}

/**
 * Menyimpan satu jenis assessment
 * tanpa menimpa assessment lainnya.
 *
 * Juga mendukung meta top-level:
 * employeeStatus
 */
async function saveAssessment(
  id: string,
  assessmentType: string,
  assessmentData: Record<string, any>
) {
  const existing =
    await findById(id);

  if (!existing) {
    return null;
  }

  const currentEvaluationData =
    parseEvaluationData(
      existing.evaluation_data
    );

  const currentAssessments =
    currentEvaluationData.assessments &&
    typeof currentEvaluationData.assessments ===
      "object"
      ? currentEvaluationData.assessments
      : {};

  const nextEvaluationData = {
    ...currentEvaluationData,

    version: 2,

    assessments: {
      ...currentAssessments,
      [assessmentType]:
        assessmentData,
    },
  };

  const result = await db.query(
    `
      UPDATE interviews
      SET
        evaluation_data = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [
      id,
      JSON.stringify(
        nextEvaluationData
      ),
    ]
  );

  if (!result.rows[0]) {
    return null;
  }

  return findById(
    result.rows[0].id
  );
}

/**
 * Menyimpan status akhir kandidat.
 *
 * Jika employeeStatus = "diterima",
 * kandidat otomatis dibuat menjadi
 * karyawan di tabel hris_employees.
 */
async function saveEmployeeStatus(
  id: string,
  employeeStatus: string | null
) {
  // ============================================================
  // 1. AMBIL DATA INTERVIEW
  // ============================================================

  const existing =
    await findById(id);

  if (!existing) {
    return null;
  }

  // ============================================================
  // 2. AMBIL evaluation_data LAMA
  // ============================================================

  const currentEvaluationData =
    parseEvaluationData(
      existing.evaluation_data
    );

  // ============================================================
  // 3. SIMPAN employeeStatus
  // ============================================================

  const nextEvaluationData = {
    ...currentEvaluationData,

    employeeStatus:
      employeeStatus,

    employeeStatusUpdatedAt:
      new Date().toISOString(),
  };

  const result = await db.query(
    `
      UPDATE interviews
      SET
        evaluation_data = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    [
      id,
      JSON.stringify(
        nextEvaluationData
      ),
    ]
  );

  if (!result.rows[0]) {
    return null;
  }

  // ============================================================
  // 4. JIKA DITERIMA
  //    OTOMATIS MASUK HRIS EMPLOYEES
  // ============================================================

  if (
    typeof employeeStatus ===
      "string" &&
    employeeStatus
      .trim()
      .toLowerCase() ===
      "diterima"
  ) {
    await db.query(
      `
        INSERT INTO hris_employees (
          apply_id,
          nama,
          email,
          no_hp,
          posisi,
          status_karyawan,
          tanggal_diterima
        )

        SELECT
          ja.id,
          ja.nama_lengkap,
          ja.email,
          ja.no_hp,
          ja.posisi,
          'AKTIF',
          CURRENT_DATE

        FROM job_applies ja

        WHERE ja.id = $1

        ON CONFLICT (apply_id)

        DO UPDATE SET
          nama = EXCLUDED.nama,
          email = EXCLUDED.email,
          no_hp = EXCLUDED.no_hp,
          posisi = EXCLUDED.posisi,
          updated_at = NOW()
      `,
      [
        existing.apply_id,
      ]
    );
  }

  // ============================================================
  // 5. KEMBALIKAN DATA INTERVIEW TERBARU
  // ============================================================

  return findById(
    result.rows[0].id
  );
}

async function remove(
  id: string
) {
  const result = await db.query(
    `
      DELETE FROM interviews
      WHERE id = $1
      RETURNING id
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export default {
  findAll,
  findResults,
  findById,
  findByApplyId,
  findByInterviewerId,
  create,
  update,
  saveAssessment,
  saveEmployeeStatus,
  remove,
};