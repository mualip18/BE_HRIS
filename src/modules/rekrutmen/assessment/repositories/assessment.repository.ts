// ============================================================
// assessment.repository.ts
// Repository Assessment Rekrutmen
// ============================================================

import pool from "../../../../config/db";

import {
  CreateAssessmentComponentInput,
  UpdateAssessmentComponentInput,
  UpsertAssessmentScoreInput,
} from "../types/assessment.types";

class AssessmentRepository {
  // =====================================================
  // COMPONENTS
  // =====================================================

  async findAllComponents() {
    const result = await pool.query(`
      SELECT
        id,
        name,
        code,
        weight,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM assessment_components
      ORDER BY
        sort_order ASC,
        created_at ASC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      weight: Number(row.weight),
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // =====================================================
  // GET COMPONENT BY ID
  // =====================================================

  async findComponentById(id: string) {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        code,
        weight,
        is_active,
        sort_order,
        created_at,
        updated_at
      FROM assessment_components
      WHERE id = $1
      `,
      [id]
    );

    if (!result.rows.length) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      name: row.name,
      code: row.code,
      weight: Number(row.weight),
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // =====================================================
  // CREATE COMPONENT
  // =====================================================

  async createComponent(
    data: CreateAssessmentComponentInput
  ) {
    const result = await pool.query(
      `
      INSERT INTO assessment_components (
        name,
        code,
        weight,
        sort_order
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        name,
        code,
        weight,
        is_active,
        sort_order,
        created_at,
        updated_at
      `,
      [
        data.name.trim(),
        data.code.trim().toUpperCase(),
        Number(data.weight),
        data.sortOrder ?? 0,
      ]
    );

    const row = result.rows[0];

    return {
      id: row.id,
      name: row.name,
      code: row.code,
      weight: Number(row.weight),
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // =====================================================
  // UPDATE COMPONENT
  // =====================================================

  async updateComponent(
    id: string,
    data: UpdateAssessmentComponentInput
  ) {
    const fields: string[] = [];
    const values: unknown[] = [];

    let index = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(data.name.trim());
    }

    if (data.code !== undefined) {
      fields.push(`code = $${index++}`);
      values.push(data.code.trim().toUpperCase());
    }

    if (data.weight !== undefined) {
      fields.push(`weight = $${index++}`);
      values.push(Number(data.weight));
    }

    if (data.sortOrder !== undefined) {
      fields.push(`sort_order = $${index++}`);
      values.push(Number(data.sortOrder));
    }

    if (!fields.length) {
      return this.findComponentById(id);
    }

    fields.push(`updated_at = NOW()`);

    values.push(id);

    const result = await pool.query(
      `
      UPDATE assessment_components
      SET ${fields.join(", ")}
      WHERE id = $${index}
      RETURNING
        id,
        name,
        code,
        weight,
        is_active,
        sort_order,
        created_at,
        updated_at
      `,
      values
    );

    if (!result.rows.length) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      name: row.name,
      code: row.code,
      weight: Number(row.weight),
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // =====================================================
  // TOGGLE COMPONENT
  // =====================================================

  async toggleComponent(id: string) {
    const result = await pool.query(
      `
      UPDATE assessment_components
      SET
        is_active = NOT is_active,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        name,
        code,
        weight,
        is_active,
        sort_order,
        created_at,
        updated_at
      `,
      [id]
    );

    if (!result.rows.length) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      name: row.name,
      code: row.code,
      weight: Number(row.weight),
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // =====================================================
  // WEIGHT
  // =====================================================

  async getActiveWeightTotal() {
    const result = await pool.query(`
      SELECT
        COALESCE(
          SUM(weight),
          0
        ) AS total
      FROM assessment_components
      WHERE is_active = TRUE
    `);

    return Number(
      result.rows[0]?.total ?? 0
    );
  }

  // =====================================================
  // SCORE
  // =====================================================

  async upsertScore(
    data: UpsertAssessmentScoreInput
  ) {
    const result = await pool.query(
      `
      INSERT INTO assessment_scores (
        apply_id,
        component_id,
        score,
        notes,
        source_attempt_id
      )
      VALUES ($1, $2, $3, $4, $5)

      ON CONFLICT (
        apply_id,
        component_id
      )
      DO UPDATE SET
        score = EXCLUDED.score,
        notes = EXCLUDED.notes,
        source_attempt_id =
          EXCLUDED.source_attempt_id,
        updated_at = NOW()

      RETURNING
        id,
        apply_id,
        component_id,
        score,
        notes,
        source_attempt_id,
        created_at,
        updated_at
      `,
      [
        data.applyId,
        data.componentId,
        data.score ?? null,
        data.notes ?? null,
        data.sourceAttemptId ?? null,
      ]
    );

    const row = result.rows[0];

    return {
      id: row.id,

      applyId:
        Number(row.apply_id),

      componentId:
        row.component_id,

      score:
        row.score === null
          ? null
          : Number(row.score),

      notes:
        row.notes,

      sourceAttemptId:
        row.source_attempt_id,

      createdAt:
        row.created_at,

      updatedAt:
        row.updated_at,
    };
  }

  // =====================================================
  // RESULTS
  // =====================================================
  //
  // PERBAIKAN:
  //
  // Total Nilai = RATA-RATA SEDERHANA dari semua
  // komponen yang punya nilai.
  //
  // BUKAN:
  //   score × (weight / 100)
  //
  // Jadi PG=80, Essay=90, Audio=70
  //   => (80 + 90 + 70) / 3 = 80
  //
  // Bukan:
  //   80×0.5 + 90×0.3 + 70×0.2 = 81
  // =====================================================

  async findResults() {
    const componentsResult =
      await pool.query(`
        SELECT
          id,
          name,
          code,
          weight,
          sort_order
        FROM assessment_components
        WHERE is_active = TRUE
        ORDER BY
          sort_order ASC,
          created_at ASC
      `);

    const components =
      componentsResult.rows.map(
        (row) => ({
          id: row.id,
          name: row.name,
          code: row.code,
          weight: Number(row.weight),
          sortOrder:
            row.sort_order,
        })
      );

    const candidatesResult =
      await pool.query(`
        SELECT
          ja.id AS apply_id,
          ja.user_id AS candidate_id,
          ja.nama_lengkap,
          ja.email,
          ja.no_hp,
          ja.posisi,
          ja.lembaga,
          ja.lokasi
        FROM job_applies ja
        ORDER BY
          ja.created_at DESC,
          ja.id DESC
      `);

    const scoresResult =
      await pool.query(`
        SELECT
          ass.apply_id,
          ass.component_id,
          ass.score
        FROM assessment_scores ass
        INNER JOIN assessment_components ac
          ON ac.id = ass.component_id
        WHERE ac.is_active = TRUE
      `);

    const scoresMap =
      new Map<
        number,
        Map<string, number | null>
      >();

    for (
      const row of scoresResult.rows
    ) {
      const applyId =
        Number(row.apply_id);

      if (!scoresMap.has(applyId)) {
        scoresMap.set(
          applyId,
          new Map()
        );
      }

      scoresMap
        .get(applyId)!
        .set(
          row.component_id,
          row.score === null
            ? null
            : Number(row.score)
        );
    }

    const results =
      candidatesResult.rows.map(
        (candidate) => {
          const applyId =
            Number(
              candidate.apply_id
            );

          const candidateScores =
            scoresMap.get(applyId) ??
            new Map();

          const componentScores:
            Record<
              string,
              number | null
            > = {};

          let complete = true;

          // ✅ Kumpulkan nilai komponen yang ada
          const scoreList: number[] = [];

          for (
            const component
            of components
          ) {
            const score =
              candidateScores.get(
                component.id
              ) ?? null;

            componentScores[
              component.id
            ] = score;

            if (score === null) {
              complete = false;
            } else {
              // ✅ Simpan TANPA dikali bobot
              scoreList.push(score);
            }
          }

          // ✅ Total = rata-rata sederhana
          const total =
            scoreList.length > 0
              ? scoreList.reduce(
                  (a, b) => a + b,
                  0
                ) / scoreList.length
              : 0;

          return {
            applyId,

            candidateId:
              candidate.candidate_id,

            kandidatNama:
              candidate.nama_lengkap ||
              "-",

            email:
              candidate.email ||
              null,

            noHp:
              candidate.no_hp ||
              null,

            posisi:
              candidate.posisi ||
              "-",

            lembaga:
              candidate.lembaga ||
              "-",

            lokasi:
              candidate.lokasi ||
              "-",

            componentScores,

            totalNilai:
              complete
                ? Number(
                    total.toFixed(2)
                  )
                : null,

            status:
              complete
                ? "Lengkap"
                : "Perlu Penilaian",
          };
        }
      );

    return {
      components,
      data: results,
    };
  }

  // =====================================================
  // SELECTION HISTORY
  // =====================================================

  async findSelectionHistory(
    applyId: number
  ) {
    const applicationResult =
      await pool.query(
        `
        SELECT
          id,
          user_id
        FROM job_applies
        WHERE id = $1
        LIMIT 1
        `,
        [applyId]
      );

    if (!applicationResult.rows.length) {
      return [];
    }

    const application =
      applicationResult.rows[0];

    const candidateId =
      application.user_id;

    const onlineResult =
      await pool.query(
        `
        SELECT
          ta.id AS attempt_id,

          ta.started_at,

          ta.finished_at,

          ta.status AS attempt_status,

          t.id AS test_id,

          t.title AS test_title,

          ts.total_score

        FROM test_attempts ta

        INNER JOIN tests t
          ON t.id = ta.test_id

        LEFT JOIN test_scores ts
          ON ts.attempt_id = ta.id

        INNER JOIN job_applies ja
          ON ja.user_id = ta.candidate_id

        WHERE ja.id = $1

        ORDER BY
          COALESCE(
            ta.finished_at,
            ta.started_at
          ) ASC
        `,
        [applyId]
      );

    const manualResult =
      await pool.query(
        `
        SELECT
          ass.id AS assessment_score_id,

          ass.component_id,

          ass.score,

          ass.created_at,

          ass.updated_at,

          ass.source_attempt_id,

          ac.name AS component_name,

          ac.code AS component_code

        FROM assessment_scores ass

        INNER JOIN assessment_components ac
          ON ac.id = ass.component_id

        WHERE ass.apply_id = $1

        ORDER BY
          COALESCE(
            ass.updated_at,
            ass.created_at
          ) ASC
        `,
        [applyId]
      );

    const onlineHistory =
      onlineResult.rows.map(
        (row) => {
          const finishedAt =
            row.finished_at
              ? new Date(
                  row.finished_at
                )
              : null;

          const startedAt =
            row.started_at
              ? new Date(
                  row.started_at
                )
              : null;

          const date =
            finishedAt ??
            startedAt;

          const attemptStatus =
            String(
              row.attempt_status ??
              ""
            ).toLowerCase();

          let status:
            | "Selesai"
            | "Perlu Penilaian"
            | "Belum Dikerjakan";

          if (
            finishedAt ||
            attemptStatus ===
              "completed"
          ) {
            status = "Selesai";
          } else if (
            startedAt ||
            attemptStatus ===
              "in_progress"
          ) {
            status =
              "Perlu Penilaian";
          } else {
            status =
              "Belum Dikerjakan";
          }

          return {
            id:
              `online-${row.attempt_id}`,

            type:
              "online" as const,

            name:
              row.test_title ||
              "Tes Online",

            code:
              null,

            date:
              date
                ? date.toISOString()
                : null,

            startedAt:
              startedAt
                ? startedAt.toISOString()
                : null,

            completedAt:
              finishedAt
                ? finishedAt.toISOString()
                : null,

            score:
              row.total_score ===
                null ||
              row.total_score ===
                undefined
                ? null
                : Number(
                    row.total_score
                  ),

            status,

            attemptId:
              row.attempt_id,

            componentId:
              null,
          };
        }
      );

    const manualHistory =
      manualResult.rows.map(
        (row) => {
          const createdAt =
            row.created_at
              ? new Date(
                  row.created_at
                )
              : null;

          const updatedAt =
            row.updated_at
              ? new Date(
                  row.updated_at
                )
              : null;

          const date =
            updatedAt ??
            createdAt;

          let status:
            | "Selesai"
            | "Perlu Penilaian"
            | "Belum Dikerjakan";

          if (
            row.score !== null &&
            row.score !== undefined
          ) {
            status = "Selesai";
          } else {
            status =
              "Perlu Penilaian";
          }

          return {
            id:
              `manual-${row.assessment_score_id}`,

            type:
              "manual" as const,

            name:
              row.component_name ||
              "Assessment",

            code:
              row.component_code ||
              null,

            date:
              date
                ? date.toISOString()
                : null,

            startedAt:
              null,

            completedAt:
              null,

            score:
              row.score === null ||
              row.score === undefined
                ? null
                : Number(
                    row.score
                  ),

            status,

            attemptId:
              row.source_attempt_id ||
              null,

            componentId:
              row.component_id,
          };
        }
      );

    const history = [
      ...onlineHistory,
      ...manualHistory,
    ];

    history.sort(
      (a, b) => {
        if (
          !a.date &&
          !b.date
        ) {
          return 0;
        }

        if (!a.date) {
          return 1;
        }

        if (!b.date) {
          return -1;
        }

        return (
          new Date(a.date).getTime() -
          new Date(b.date).getTime()
        );
      }
    );

    return history;
  }
}

// ============================================================
// EXPORT
// ============================================================

export const assessmentRepository =
  new AssessmentRepository();