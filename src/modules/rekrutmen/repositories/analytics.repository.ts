import pool from "../../../config/db";

import {
  AnalyticsFilter,
  RecruitmentAnalytics,
  RecruitmentPosition,
  RecruitmentReportRow,
  RecruitmentStatus,
  RecruitmentTrend,
} from "../types/analytics.types";

/**
 * ============================================================
 * BUILD FILTER
 * ============================================================
 */
function buildFilter(
  filters: AnalyticsFilter,
  alias = "ja"
) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.startDate) {
    params.push(filters.startDate);

    conditions.push(
      `${alias}.created_at >= $${params.length}::timestamp`
    );
  }

  if (filters.endDate) {
    params.push(filters.endDate);

    conditions.push(
      `${alias}.created_at < ($${params.length}::date + INTERVAL '1 day')`
    );
  }

  if (filters.jobId) {
    params.push(filters.jobId);

    conditions.push(
      `${alias}.lowongan_id = $${params.length}`
    );
  }

  if (filters.posisi) {
    params.push(filters.posisi);

    conditions.push(
      `LOWER(TRIM(${alias}.posisi)) = LOWER(TRIM($${params.length}))`
    );
  }

  return {
    sql: conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "",
    params,
  };
}

/**
 * ============================================================
 * SUMMARY
 * ============================================================
 */
async function getSummary(
  filters: AnalyticsFilter
) {
  const filter = buildFilter(filters);

  const query = `
    WITH latest_assessment AS (
      SELECT *
      FROM (
        SELECT
          ar.*,
          ROW_NUMBER() OVER (
            PARTITION BY ar.apply_id
            ORDER BY
              ar.updated_at DESC NULLS LAST,
              ar.created_at DESC NULLS LAST
          ) AS rn
        FROM assessment_results ar
      ) x
      WHERE x.rn = 1
    ),

    latest_interview AS (
      SELECT *
      FROM (
        SELECT
          i.*,
          ROW_NUMBER() OVER (
            PARTITION BY i.apply_id
            ORDER BY
              i.updated_at DESC NULLS LAST,
              i.created_at DESC NULLS LAST
          ) AS rn
        FROM interviews i
      ) x
      WHERE x.rn = 1
    )

    SELECT

      COUNT(DISTINCT ja.id)::int
        AS "totalPelamar",

      COUNT(DISTINCT CASE
        WHEN ar.passed = true
        THEN ja.id
      END)::int
        AS "lolosAssessment",

      COUNT(DISTINCT CASE
        WHEN ja.status = 'interview'
        THEN ja.id
      END)::int
        AS "masukInterview",

      COUNT(DISTINCT CASE
        WHEN i.status = 'scheduled'
        THEN ja.id
      END)::int
        AS "interviewTerjadwal",

      COUNT(DISTINCT CASE
        WHEN i.decision = 'lulus'
        THEN ja.id
      END)::int
        AS "interviewLulus",

      COUNT(DISTINCT CASE
        WHEN i.evaluation_data->>'employeeStatus' = 'diterima'
        THEN ja.id
      END)::int
        AS "diterima",

      COUNT(DISTINCT CASE
        WHEN i.evaluation_data->>'employeeStatus' = 'gagal'
        THEN ja.id
      END)::int
        AS "gagal"

    FROM job_applies ja

    LEFT JOIN latest_assessment ar
      ON ar.apply_id = ja.id

    LEFT JOIN latest_interview i
      ON i.apply_id = ja.id

    ${filter.sql}
  `;

  const result = await pool.query(
    query,
    filter.params
  );

  return result.rows[0];
}

/**
 * ============================================================
 * TRENDS
 * ============================================================
 */
async function getTrends(
  filters: AnalyticsFilter
): Promise<RecruitmentTrend[]> {
  const filter = buildFilter(filters);

  const query = `
    SELECT

      TO_CHAR(
        DATE_TRUNC('month', ja.created_at),
        'YYYY-MM'
      ) AS periode,

      COUNT(*)::int AS total

    FROM job_applies ja

    ${filter.sql}

    GROUP BY DATE_TRUNC(
      'month',
      ja.created_at
    )

    ORDER BY DATE_TRUNC(
      'month',
      ja.created_at
    )
  `;

  const result = await pool.query(
    query,
    filter.params
  );

  return result.rows;
}

/**
 * ============================================================
 * POSITIONS
 * ============================================================
 */
async function getPositions(
  filters: AnalyticsFilter
): Promise<RecruitmentPosition[]> {
  const filter = buildFilter(filters);

  const query = `
    WITH latest_assessment AS (
      SELECT *
      FROM (
        SELECT
          ar.*,
          ROW_NUMBER() OVER (
            PARTITION BY ar.apply_id
            ORDER BY
              ar.updated_at DESC NULLS LAST,
              ar.created_at DESC NULLS LAST
          ) AS rn
        FROM assessment_results ar
      ) x
      WHERE x.rn = 1
    ),

    latest_interview AS (
      SELECT *
      FROM (
        SELECT
          i.*,
          ROW_NUMBER() OVER (
            PARTITION BY i.apply_id
            ORDER BY
              i.updated_at DESC NULLS LAST,
              i.created_at DESC NULLS LAST
          ) AS rn
        FROM interviews i
      ) x
      WHERE x.rn = 1
    )

    SELECT

      COALESCE(
        NULLIF(TRIM(ja.posisi), ''),
        'Tidak diketahui'
      ) AS posisi,

      COUNT(DISTINCT ja.id)::int
        AS total,

      COUNT(DISTINCT CASE
        WHEN ar.passed = true
        THEN ja.id
      END)::int
        AS "assessmentLulus",

      COUNT(DISTINCT CASE
        WHEN i.decision = 'lulus'
        THEN ja.id
      END)::int
        AS "interviewLulus",

      COUNT(DISTINCT CASE
        WHEN i.evaluation_data->>'employeeStatus' = 'diterima'
        THEN ja.id
      END)::int
        AS diterima

    FROM job_applies ja

    LEFT JOIN latest_assessment ar
      ON ar.apply_id = ja.id

    LEFT JOIN latest_interview i
      ON i.apply_id = ja.id

    ${filter.sql}

    GROUP BY TRIM(ja.posisi)

    ORDER BY total DESC
  `;

  const result = await pool.query(
    query,
    filter.params
  );

  return result.rows;
}

/**
 * ============================================================
 * STATUSES
 * ============================================================
 */
async function getStatuses(
  filters: AnalyticsFilter
): Promise<RecruitmentStatus[]> {
  const filter = buildFilter(filters);

  const query = `
    WITH latest_interview AS (
      SELECT *
      FROM (
        SELECT
          i.*,
          ROW_NUMBER() OVER (
            PARTITION BY i.apply_id
            ORDER BY
              i.updated_at DESC NULLS LAST,
              i.created_at DESC NULLS LAST
          ) AS rn
        FROM interviews i
      ) x
      WHERE x.rn = 1
    )

    SELECT

      CASE

        WHEN i.evaluation_data->>'employeeStatus' = 'diterima'
          THEN 'Diterima'

        WHEN i.evaluation_data->>'employeeStatus' = 'gagal'
          THEN 'Gagal'

        WHEN i.decision = 'lulus'
          THEN 'Interview Lulus'

        WHEN i.decision = 'tidak_lulus'
          THEN 'Interview Tidak Lulus'

        WHEN i.status = 'scheduled'
          THEN 'Interview Terjadwal'

        WHEN ja.status = 'interview'
          THEN 'Tahap Interview'

        ELSE COALESCE(
          ja.status,
          'Belum Diproses'
        )

      END AS status,

      COUNT(DISTINCT ja.id)::int AS total

    FROM job_applies ja

    LEFT JOIN latest_interview i
      ON i.apply_id = ja.id

    ${filter.sql}

    GROUP BY 1

    ORDER BY total DESC
  `;

  const result = await pool.query(
    query,
    filter.params
  );

  return result.rows;
}

/**
 * ============================================================
 * REPORT
 *
 * SATU BARIS = SATU LAMARAN
 *
 * Identitas:
 * - namaLengkap
 * - email
 * - noHp
 *
 * Lamaran:
 * - posisi
 * - lowongan
 * - tanggalLamar
 *
 * Assessment:
 * - assessmentScore
 * - assessmentPassingScore
 * - assessmentStatus
 * - assessmentPassed
 *
 * Interview:
 * - interviewDate
 * - interviewTime
 * - interviewerName
 * - interviewerPosition
 * - interviewMethod
 * - interviewLocation
 * - interviewStatus
 * - interviewScore
 * - interviewDecision
 * - interviewNotes
 *
 * Final:
 * - employeeStatus
 * ============================================================
 */
async function getReport(
  filters: AnalyticsFilter
): Promise<RecruitmentReportRow[]> {
  const filter = buildFilter(filters);

  const query = `
    WITH latest_assessment AS (
      SELECT *
      FROM (
        SELECT
          ar.*,

          ROW_NUMBER() OVER (
            PARTITION BY ar.apply_id
            ORDER BY
              ar.updated_at DESC NULLS LAST,
              ar.created_at DESC NULLS LAST
          ) AS rn

        FROM assessment_results ar
      ) x

      WHERE x.rn = 1
    ),

    latest_interview AS (
      SELECT *
      FROM (
        SELECT
          i.*,

          ROW_NUMBER() OVER (
            PARTITION BY i.apply_id
            ORDER BY
              i.updated_at DESC NULLS LAST,
              i.created_at DESC NULLS LAST
          ) AS rn

        FROM interviews i
      ) x

      WHERE x.rn = 1
    )

    SELECT

      /* ========================================================
         IDENTITAS KANDIDAT
      ======================================================== */

      ja.id
        AS "applyId",

      ja.nama_lengkap
        AS "namaLengkap",

      ja.email
        AS "email",

      ja.no_hp
        AS "noHp",

      /* ========================================================
         DATA LAMARAN
      ======================================================== */

      ja.posisi
        AS "posisi",

      l.title
        AS "lowongan",

      ja.created_at
        AS "tanggalLamar",

      /* ========================================================
         ASSESSMENT
      ======================================================== */

      ar.total_score
        AS "assessmentScore",

      ar.passing_score
        AS "assessmentPassingScore",

      ar.status
        AS "assessmentStatus",

      ar.passed
        AS "assessmentPassed",

      /* ========================================================
         INTERVIEW
      ======================================================== */

      i.interview_date
        AS "interviewDate",

      i.interview_time
        AS "interviewTime",

      i.interviewer_name
        AS "interviewerName",

      i.interviewer_position
        AS "interviewerPosition",

      i.method
        AS "interviewMethod",

      i.location
        AS "interviewLocation",

      i.status
        AS "interviewStatus",

      i.total_score
        AS "interviewScore",

      i.decision
        AS "interviewDecision",

      i.notes
        AS "interviewNotes",

      /* ========================================================
         HASIL AKHIR
      ======================================================== */

      i.evaluation_data->>'employeeStatus'
        AS "employeeStatus"

    FROM job_applies ja

    LEFT JOIN lowongans l
      ON l.id = ja.lowongan_id

    LEFT JOIN latest_assessment ar
      ON ar.apply_id = ja.id

    LEFT JOIN latest_interview i
      ON i.apply_id = ja.id

    ${filter.sql}

    ORDER BY
      ja.created_at DESC
  `;

  const result = await pool.query(
    query,
    filter.params
  );

  return result.rows;
}

/**
 * ============================================================
 * GET ANALYTICS
 * ============================================================
 */
async function getAnalytics(
  filters: AnalyticsFilter
): Promise<RecruitmentAnalytics> {
  const [
    summary,
    trends,
    positions,
    statuses,
  ] = await Promise.all([
    getSummary(filters),
    getTrends(filters),
    getPositions(filters),
    getStatuses(filters),
  ]);

  /**
   * Funnel
   */
  const funnel = [
    {
      label: "Total Pelamar",
      value: Number(
        summary.totalPelamar || 0
      ),
    },

    {
      label: "Lolos Assessment",
      value: Number(
        summary.lolosAssessment || 0
      ),
    },

    {
      label: "Masuk Interview",
      value: Number(
        summary.masukInterview || 0
      ),
    },

    {
      label: "Interview Lulus",
      value: Number(
        summary.interviewLulus || 0
      ),
    },

    {
      label: "Diterima",
      value: Number(
        summary.diterima || 0
      ),
    },
  ];

  return {
    summary: {
      totalPelamar: Number(
        summary.totalPelamar || 0
      ),

      lolosAssessment: Number(
        summary.lolosAssessment || 0
      ),

      masukInterview: Number(
        summary.masukInterview || 0
      ),

      interviewTerjadwal: Number(
        summary.interviewTerjadwal || 0
      ),

      interviewLulus: Number(
        summary.interviewLulus || 0
      ),

      diterima: Number(
        summary.diterima || 0
      ),

      gagal: Number(
        summary.gagal || 0
      ),
    },

    funnel,

    trends,

    positions,

    statuses,
  };
}

/**
 * ============================================================
 * EXPORT
 * ============================================================
 */
export default {
  getAnalytics,
  getReport,
};