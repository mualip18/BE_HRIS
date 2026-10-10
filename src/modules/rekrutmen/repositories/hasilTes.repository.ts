import pool from "../../../config/db";

export interface HasilTesFilter {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  testId?: string;
}

type CandidateResultStatus =
  | "Perlu Review"
  | "Lolos"
  | "Tidak Lolos";

type CandidateDecision =
  | "not_passed"
  | "without_note"
  | "with_note";

export class HasilTesRepository {
  // ============================================================
  // HELPERS
  // ============================================================

  private normalizeQuestionType(value: unknown): string {
    return String(value ?? "")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");
  }

  private isMultipleChoice(type: unknown): boolean {
    return [
      "MULTIPLE_CHOICE",
      "PILIHAN_GANDA",
    ].includes(
      this.normalizeQuestionType(type)
    );
  }

  private isEssay(type: unknown): boolean {
    return [
      "ESSAY",
      "ESAI",
    ].includes(
      this.normalizeQuestionType(type)
    );
  }

  private isAudio(type: unknown): boolean {
    return [
      "AUDIO",
      "VOICE_NOTE",
    ].includes(
      this.normalizeQuestionType(type)
    );
  }

  private isManualReviewType(type: unknown): boolean {
    return (
      this.isEssay(type) ||
      this.isAudio(type)
    );
  }

  private normalizeStatus(value: unknown): string {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }

  private normalizeDecision(
    value: unknown
  ): CandidateDecision | null {
    const decision =
      String(value ?? "")
        .trim()
        .toLowerCase();

    if (
      decision ===
      "not_passed"
    ) {
      return "not_passed";
    }

    if (
      decision ===
      "without_note"
    ) {
      return "without_note";
    }

    if (
      decision ===
      "with_note"
    ) {
      return "with_note";
    }

    return null;
  }

  // ============================================================
  // APPLY ID DARI ATTEMPT
  // ============================================================

  async getApplyIdByAttempt(
    attemptId: string
  ): Promise<number | null> {
    const query = `
      SELECT
        ja.id AS apply_id

      FROM test_attempts ta

      LEFT JOIN job_applies ja
        ON ja.user_id = ta.candidate_id

      WHERE ta.id = $1

      ORDER BY ja.id DESC

      LIMIT 1
    `;

    const result =
      await pool.query(
        query,
        [attemptId]
      );

    if (!result.rows.length) {
      return null;
    }

    const value =
      Number(
        result.rows[0]
          .apply_id
      );

    return Number.isFinite(
      value
    )
      ? value
      : null;
  }

  // ============================================================
  // GET APPLY IDS
  // ============================================================

  async findApplyIds(options: {
    search?: string;
    testId?: string;
  }): Promise<number[]> {
    const params: any[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    const search =
      String(
        options.search ?? ""
      ).trim();

    if (search) {
      conditions.push(`
        (
          ja.nama_lengkap ILIKE $${paramIndex}
          OR ja.email ILIKE $${paramIndex}
          OR ja.posisi ILIKE $${paramIndex}
          OR l.title ILIKE $${paramIndex}
          OR t.title ILIKE $${paramIndex}
        )
      `);

      params.push(
        `%${search}%`
      );

      paramIndex++;
    }

    if (options.testId) {
      conditions.push(
        `ta.test_id = $${paramIndex}`
      );

      params.push(
        options.testId
      );

      paramIndex++;
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(
            " AND "
          )}`
        : "";

    const query = `
      SELECT DISTINCT
        ja.id AS apply_id

      FROM test_attempts ta

      INNER JOIN job_applies ja
        ON ja.user_id = ta.candidate_id

      LEFT JOIN lowongans l
        ON l.id = ja.lowongan_id

      LEFT JOIN tests t
        ON t.id = ta.test_id

      ${whereClause}

      ORDER BY ja.id ASC
    `;

    const result =
      await pool.query(
        query,
        params
      );

    return result.rows
      .map((row) =>
        Number(
          row.apply_id
        )
      )
      .filter(
        (value) =>
          Number.isFinite(
            value
          )
      );
  }

  // ============================================================
  // SETTINGS NILAI LOLOS
  // ============================================================

  async getPassingScore(): Promise<number> {
    const query = `
      SELECT
        passing_score

      FROM assessment_settings

      WHERE id = 1

      LIMIT 1
    `;

    const result =
      await pool.query(
        query
      );

    if (!result.rows.length) {
      return 70;
    }

    const value =
      Number(
        result.rows[0]
          .passing_score
      );

    return Number.isFinite(
      value
    )
      ? value
      : 70;
  }

  async updatePassingScore(
    passingScore: number
  ) {
    const numericPassingScore =
      Number(passingScore);

    if (
      !Number.isFinite(
        numericPassingScore
      ) ||
      numericPassingScore < 0 ||
      numericPassingScore > 100
    ) {
      throw new Error(
        "Nilai lolos harus berada di antara 0 sampai 100"
      );
    }

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      const settingsResult =
        await client.query(
          `
            INSERT INTO assessment_settings (
              id,
              passing_score,
              updated_at
            )
            VALUES (
              1,
              $1,
              NOW()
            )
            ON CONFLICT (id)
            DO UPDATE SET
              passing_score =
                EXCLUDED.passing_score,
              updated_at =
                NOW()
            RETURNING *
          `,
          [
            numericPassingScore,
          ]
        );

      await client.query(
        `
          UPDATE assessment_results

          SET
            passing_score = $1,

            status = CASE

              WHEN decision = 'with_note'
                AND total_score IS NOT NULL
                AND completed_tests >= total_tests
                AND scored_tests >= total_tests
              THEN 'Lolos'

              WHEN decision = 'without_note'
                AND total_score IS NOT NULL
                AND completed_tests >= total_tests
                AND scored_tests >= total_tests
              THEN 'Lolos'

              WHEN total_score IS NULL
                OR COALESCE(total_tests, 0) = 0
                OR completed_tests < total_tests
                OR scored_tests < total_tests
              THEN 'Perlu Review'

              WHEN total_score >= $1
              THEN 'Lolos'

              ELSE 'Tidak Lolos'

            END,

            passed = CASE

              WHEN decision IN (
                'with_note',
                'without_note'
              )
                AND total_score IS NOT NULL
                AND completed_tests >= total_tests
                AND scored_tests >= total_tests
              THEN TRUE

              WHEN total_score IS NULL
                OR COALESCE(total_tests, 0) = 0
                OR completed_tests < total_tests
                OR scored_tests < total_tests
              THEN NULL

              WHEN total_score >= $1
              THEN TRUE

              ELSE FALSE

            END,

            updated_at = NOW()
        `,
        [
          numericPassingScore,
        ]
      );

      await client.query(
        "COMMIT"
      );

      return settingsResult
        .rows[0];
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================
  // UPDATE KEPUTUSAN KANDIDAT
  //
  // not_passed:
  //   Kembali ke hasil otomatis.
  //
  // without_note:
  //   Paksa Lolos.
  //
  // with_note:
  //   Paksa Lolos dengan catatan.
  // ============================================================

  async updateCandidateDecision(
    applyId: number,
    decision: CandidateDecision,
    catatan: string | null
  ) {
    const query = `
      WITH calculated AS (
        SELECT
          ar.id,
          ar.apply_id,
          ar.total_score,
          ar.passing_score,
          ar.total_tests,
          ar.completed_tests,
          ar.scored_tests,

          CASE

            WHEN ar.total_score IS NULL
              OR COALESCE(ar.total_tests, 0) = 0
              OR COALESCE(ar.completed_tests, 0)
                  < COALESCE(ar.total_tests, 0)
              OR COALESCE(ar.scored_tests, 0)
                  < COALESCE(ar.total_tests, 0)

            THEN 'Perlu Review'::text

            WHEN ar.total_score >=
                 COALESCE(ar.passing_score, 70)

            THEN 'Lolos'::text

            ELSE 'Tidak Lolos'::text

          END AS automatic_status

        FROM assessment_results ar

        WHERE ar.apply_id = $1

        ORDER BY
          ar.updated_at DESC NULLS LAST

        LIMIT 1
      ),

      updated AS (
        UPDATE assessment_results ar

        SET

          decision = $2::varchar,

          catatan = CASE
            WHEN $2::text = 'with_note'
            THEN NULLIF(
              BTRIM(
                COALESCE(
                  $3::text,
                  ''
                )
              ),
              ''
            )
            ELSE NULL
          END,

          status = CASE

            WHEN $2::text = 'not_passed'
            THEN c.automatic_status

            WHEN $2::text = 'without_note'
            THEN 'Lolos'

            WHEN $2::text = 'with_note'
            THEN 'Lolos'

            ELSE c.automatic_status

          END,

          passed = CASE

            WHEN $2::text = 'not_passed'
              AND c.automatic_status = 'Lolos'
            THEN TRUE

            WHEN $2::text = 'not_passed'
              AND c.automatic_status = 'Tidak Lolos'
            THEN FALSE

            WHEN $2::text = 'not_passed'
            THEN NULL

            WHEN $2::text IN (
              'without_note',
              'with_note'
            )
            THEN TRUE

            ELSE NULL

          END,

          updated_at = NOW()

        FROM calculated c

        WHERE ar.id = c.id

        RETURNING
          ar.apply_id,
          ar.decision,
          ar.catatan,
          ar.status,
          ar.passed,
          ar.total_score,
          ar.passing_score,
          ar.total_tests,
          ar.completed_tests,
          ar.scored_tests,
          ar.updated_at
      )

      SELECT
        u.apply_id,
        u.decision,
        u.catatan,
        u.status,
        u.passed,
        u.total_score,
        u.passing_score,
        u.total_tests,
        u.completed_tests,
        u.scored_tests,
        u.updated_at,

        c.automatic_status,
        c.automatic_status AS score_status

      FROM updated u

      INNER JOIN calculated c
        ON c.apply_id = u.apply_id

      LIMIT 1
    `;

    const result =
      await pool.query(
        query,
        [
          applyId,
          decision,
          catatan,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      throw new Error(
        "Data assessment kandidat tidak ditemukan"
      );
    }

    return result.rows[0];
  }

  // ============================================================
  // GET LIST
  // ============================================================

  async findAll(
    filter: HasilTesFilter
  ) {
    const {
      page,
      limit,
      search = "",
      status = "semua",
      testId,
    } = filter;

    const safePage =
      Math.max(
        1,
        Number(page) || 1
      );

    const safeLimit =
      Math.min(
        100,
        Math.max(
          1,
          Number(limit) || 10
        )
      );

    const offset =
      (safePage - 1) *
      safeLimit;

    const params: any[] = [];
    const conditions: string[] = [];

    let paramIndex = 1;

    if (search.trim()) {
      conditions.push(`
        (
          ja.nama_lengkap ILIKE $${paramIndex}
          OR ja.email ILIKE $${paramIndex}
          OR ja.posisi ILIKE $${paramIndex}
          OR l.title ILIKE $${paramIndex}
          OR t.title ILIKE $${paramIndex}
        )
      `);

      params.push(
        `%${search.trim()}%`
      );

      paramIndex++;
    }

    if (testId) {
      conditions.push(
        `ta.test_id = $${paramIndex}`
      );

      params.push(
        testId
      );

      paramIndex++;
    }

    const normalizedStatus =
      this.normalizeStatus(
        status
      );

    if (
      normalizedStatus &&
      normalizedStatus !==
        "semua"
    ) {
      if (
        normalizedStatus ===
        "lolos"
      ) {
        conditions.push(`
          ar.status = 'Lolos'
        `);
      } else if (
        normalizedStatus ===
          "tidak lolos" ||
        normalizedStatus ===
          "tidak_lolos"
      ) {
        conditions.push(`
          ar.status = 'Tidak Lolos'
        `);
      } else if (
        normalizedStatus ===
          "perlu review" ||
        normalizedStatus ===
          "perlu_review"
      ) {
        conditions.push(`
          (
            ar.status = 'Perlu Review'

            OR (

              ta.status = 'completed'

              AND EXISTS (
                SELECT 1

                FROM test_answers tar

                JOIN questions qr
                  ON qr.id =
                     tar.question_id

                WHERE tar.attempt_id =
                      ta.id

                  AND UPPER(
                    qr.question_type::text
                  ) IN (
                    'ESSAY',
                    'ESAI',
                    'AUDIO',
                    'VOICE_NOTE'
                  )

                  AND tar.score IS NULL
              )
            )
          )
        `);
      } else if (
        normalizedStatus ===
          "selesai" ||
        normalizedStatus ===
          "completed"
      ) {
        conditions.push(`
          ta.status = 'completed'
        `);
      }
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(
            " AND "
          )}`
        : "";

    const countQuery = `
      SELECT
        COUNT(*)::int AS total

      FROM test_attempts ta

      LEFT JOIN test_scores ts
        ON ts.attempt_id = ta.id

      LEFT JOIN job_applies ja
        ON ja.user_id =
           ta.candidate_id

      LEFT JOIN lowongans l
        ON l.id =
           ja.lowongan_id

      LEFT JOIN tests t
        ON t.id =
           ta.test_id

      LEFT JOIN LATERAL (
        SELECT ar1.*
        FROM assessment_results ar1

        WHERE ar1.apply_id =
              ja.id

        ORDER BY
          ar1.updated_at
          DESC NULLS LAST

        LIMIT 1
      ) ar
        ON TRUE

      ${whereClause}
    `;

    const countResult =
      await pool.query(
        countQuery,
        params
      );

    const total =
      Number(
        countResult.rows[0]
          ?.total ?? 0
      );

    const dataParams = [
      ...params,
    ];

    const limitIndex =
      paramIndex++;

    const offsetIndex =
      paramIndex++;

    dataParams.push(
      safeLimit
    );

    dataParams.push(
      offset
    );

    const dataQuery = `
      SELECT

        ta.id AS attempt_id,
        ta.candidate_id,
        ta.test_id,
        ta.started_at,
        ta.finished_at,
        ta.status AS attempt_status,

        CASE

          WHEN ta.status =
               'completed'

            AND EXISTS (
              SELECT 1

              FROM test_answers tar

              JOIN questions qr
                ON qr.id =
                   tar.question_id

              WHERE tar.attempt_id =
                    ta.id

                AND UPPER(
                  qr.question_type::text
                ) IN (
                  'ESSAY',
                  'ESAI',
                  'AUDIO',
                  'VOICE_NOTE'
                )

                AND tar.score IS NULL
            )

          THEN 'Perlu Review'

          WHEN ta.status =
               'completed'

          THEN 'Selesai'

          ELSE 'Perlu Review'

        END AS hasil_status,

        qt.question_type,
        qt.type_count,

        CASE

          WHEN qt.type_count <> 1
          THEN NULL

          WHEN qt.question_type =
               'MULTIPLE_CHOICE'
          THEN ts.multiple_choice_score

          WHEN qt.question_type =
               'ESSAY'
          THEN ts.essay_score

          WHEN qt.question_type =
               'AUDIO'
          THEN ts.audio_score

          ELSE NULL

        END AS nilai_tes,

        ts.id AS score_id,
        ts.multiple_choice_score,
        ts.essay_score,
        ts.audio_score,
        ts.total_score AS raw_total_score,

        ar.total_score AS final_total_score,
        ar.passing_score AS final_passing_score,
        ar.status AS final_status,
        ar.decision AS final_decision,
        ar.passed AS final_passed,
        ar.catatan AS final_catatan,
        ar.total_tests AS final_total_tests,
        ar.completed_tests AS final_completed_tests,
        ar.scored_tests AS final_scored_tests,
        ar.updated_at AS final_updated_at,

        ja.id AS apply_id,
        ja.nama_lengkap,
        ja.email,
        ja.no_hp,
        ja.posisi AS posisi_apply,
        ja.lembaga,
        ja.lokasi,

        l.title AS posisi_lowongan,
        l.perusahaan,
        l.lokasi AS lokasi_lowongan,

        t.title AS test_name

      FROM test_attempts ta

      LEFT JOIN test_scores ts
        ON ts.attempt_id =
           ta.id

      LEFT JOIN job_applies ja
        ON ja.user_id =
           ta.candidate_id

      LEFT JOIN lowongans l
        ON l.id =
           ja.lowongan_id

      LEFT JOIN tests t
        ON t.id =
           ta.test_id

      LEFT JOIN LATERAL (
        SELECT

          COUNT(
            DISTINCT CASE

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'MULTIPLE_CHOICE',
                'PILIHAN_GANDA'
              )
              THEN 'MULTIPLE_CHOICE'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'ESSAY',
                'ESAI'
              )
              THEN 'ESSAY'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'AUDIO',
                'VOICE_NOTE'
              )
              THEN 'AUDIO'

              ELSE UPPER(
                q.question_type::text
              )

            END
          ) AS type_count,

          MAX(
            CASE

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'MULTIPLE_CHOICE',
                'PILIHAN_GANDA'
              )
              THEN 'MULTIPLE_CHOICE'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'ESSAY',
                'ESAI'
              )
              THEN 'ESSAY'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'AUDIO',
                'VOICE_NOTE'
              )
              THEN 'AUDIO'

              ELSE UPPER(
                q.question_type::text
              )

            END
          ) AS question_type

        FROM questions q

        WHERE q.test_id =
              ta.test_id
      ) qt
        ON TRUE

      LEFT JOIN LATERAL (
        SELECT ar1.*
        FROM assessment_results ar1

        WHERE ar1.apply_id =
              ja.id

        ORDER BY
          ar1.updated_at
          DESC NULLS LAST

        LIMIT 1
      ) ar
        ON TRUE

      ${whereClause}

      ORDER BY
        ta.started_at DESC

      LIMIT $${limitIndex}

      OFFSET $${offsetIndex}
    `;

    const result =
      await pool.query(
        dataQuery,
        dataParams
      );

    const data =
      result.rows.map(
        (row) => {
          const finalStatus =
            row.final_status ||
            "Perlu Review";

          return {
            id:
              row.attempt_id,

            attemptId:
              row.attempt_id,

            candidateId:
              row.candidate_id,

            testId:
              row.test_id,

            kandidatNama:
              row.nama_lengkap ||
              "-",

            email:
              row.email ||
              "-",

            noHp:
              row.no_hp ??
              null,

            applyId:
              row.apply_id ??
              null,

            posisi:
              row.posisi_lowongan ||
              row.posisi_apply ||
              "-",

            lembaga:
              row.perusahaan ||
              row.lembaga ||
              "-",

            lokasi:
              row.lokasi_lowongan ||
              row.lokasi ||
              "-",

            materiNama:
              row.test_name ||
              "-",

            tanggalTes:
              row.finished_at ||
              row.started_at ||
              null,

            startedAt:
              row.started_at ||
              null,

            finishedAt:
              row.finished_at ||
              null,

            totalNilai:
              row.nilai_tes !== null &&
              row.nilai_tes !== undefined
                ? Number(
                    row.nilai_tes
                  )
                : null,

            multipleChoiceScore:
              row.multiple_choice_score !== null &&
              row.multiple_choice_score !== undefined
                ? Number(
                    row.multiple_choice_score
                  )
                : null,

            essayScore:
              row.essay_score !== null &&
              row.essay_score !== undefined
                ? Number(
                    row.essay_score
                  )
                : null,

            audioScore:
              row.audio_score !== null &&
              row.audio_score !== undefined
                ? Number(
                    row.audio_score
                  )
                : null,

            finalTotalNilai:
              row.final_total_score !== null &&
              row.final_total_score !== undefined
                ? Number(
                    row.final_total_score
                  )
                : null,

            finalPassingScore:
              row.final_passing_score !== null &&
              row.final_passing_score !== undefined
                ? Number(
                    row.final_passing_score
                  )
                : 70,

            finalStatus,

            decision:
              this.normalizeDecision(
                row.final_decision
              ),

            finalTotalTests:
              row.final_total_tests !== null &&
              row.final_total_tests !== undefined
                ? Number(
                    row.final_total_tests
                  )
                : 0,

            finalCompletedTests:
              row.final_completed_tests !== null &&
              row.final_completed_tests !== undefined
                ? Number(
                    row.final_completed_tests
                  )
                : 0,

            finalScoredTests:
              row.final_scored_tests !== null &&
              row.final_scored_tests !== undefined
                ? Number(
                    row.final_scored_tests
                  )
                : 0,

            catatan:
              row.final_catatan ??
              null,

            passed:
              row.final_passed !== null &&
              row.final_passed !== undefined
                ? row.final_passed === true
                : finalStatus ===
                    "Lolos"
                  ? true
                  : finalStatus ===
                      "Tidak Lolos"
                    ? false
                    : null,

            attemptStatus:
              row.attempt_status ||
              "unknown",

            status:
              row.hasil_status ||
              "Perlu Review",
          };
        }
      );

    return {
      data,
      total,
    };
  }

  // ============================================================
  // RECALCULATE HASIL AKHIR KANDIDAT
  // ============================================================

  async recalculateCandidateResult(
    applyId: number
  ) {
    const numericApplyId =
      Number(applyId);

    if (
      !Number.isInteger(
        numericApplyId
      ) ||
      numericApplyId <= 0
    ) {
      return null;
    }

    const candidateResult =
      await pool.query(
        `
          SELECT
            id AS apply_id,
            user_id AS candidate_id

          FROM job_applies

          WHERE id = $1

          LIMIT 1
        `,
        [
          numericApplyId,
        ]
      );

    if (
      !candidateResult.rows.length
    ) {
      return null;
    }

    const candidateId =
      candidateResult
        .rows[0]
        .candidate_id;

    const summaryQuery = `
      WITH latest_attempts AS (
        SELECT DISTINCT ON (
          ta.test_id
        )

          ta.id,
          ta.test_id,
          ta.candidate_id,
          ta.status,
          ta.started_at,
          ta.finished_at

        FROM test_attempts ta

        WHERE ta.candidate_id = $1

        ORDER BY
          ta.test_id,

          CASE
            WHEN ta.status =
                 'completed'
            THEN 1
            ELSE 0
          END DESC,

          ta.finished_at
            DESC NULLS LAST,

          ta.started_at
            DESC NULLS LAST
      ),

      test_types AS (
        SELECT

          q.test_id,

          COUNT(
            DISTINCT CASE

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'MULTIPLE_CHOICE',
                'PILIHAN_GANDA'
              )
              THEN 'MULTIPLE_CHOICE'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'ESSAY',
                'ESAI'
              )
              THEN 'ESSAY'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'AUDIO',
                'VOICE_NOTE'
              )
              THEN 'AUDIO'

              ELSE UPPER(
                q.question_type::text
              )

            END
          ) AS type_count,

          MAX(
            CASE

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'MULTIPLE_CHOICE',
                'PILIHAN_GANDA'
              )
              THEN 'MULTIPLE_CHOICE'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'ESSAY',
                'ESAI'
              )
              THEN 'ESSAY'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'AUDIO',
                'VOICE_NOTE'
              )
              THEN 'AUDIO'

              ELSE UPPER(
                q.question_type::text
              )

            END
          ) AS question_type

        FROM questions q

        GROUP BY
          q.test_id
      ),

      per_test AS (
        SELECT

          la.id AS attempt_id,
          la.test_id,
          la.status,

          tt.type_count,
          tt.question_type,

          ts.multiple_choice_score,
          ts.essay_score,
          ts.audio_score,

          EXISTS (
            SELECT 1

            FROM test_answers tan

            JOIN questions qn
              ON qn.id =
                 tan.question_id

            WHERE tan.attempt_id =
                  la.id

              AND UPPER(
                qn.question_type::text
              ) IN (
                'ESSAY',
                'ESAI',
                'AUDIO',
                'VOICE_NOTE'
              )

              AND tan.score IS NULL
          ) AS pending_review,

          CASE

            WHEN la.status <>
                 'completed'
            THEN NULL

            WHEN tt.type_count <> 1
            THEN NULL

            WHEN tt.question_type =
                 'MULTIPLE_CHOICE'
            THEN ts.multiple_choice_score

            WHEN tt.question_type =
                 'ESSAY'
            THEN CASE

              WHEN EXISTS (
                SELECT 1

                FROM test_answers tan

                JOIN questions qn
                  ON qn.id =
                     tan.question_id

                WHERE tan.attempt_id =
                      la.id

                  AND UPPER(
                    qn.question_type::text
                  ) IN (
                    'ESSAY',
                    'ESAI'
                  )

                  AND tan.score IS NULL
              )
              THEN NULL

              ELSE ts.essay_score

            END

            WHEN tt.question_type =
                 'AUDIO'
            THEN CASE

              WHEN EXISTS (
                SELECT 1

                FROM test_answers tan

                JOIN questions qn
                  ON qn.id =
                     tan.question_id

                WHERE tan.attempt_id =
                      la.id

                  AND UPPER(
                    qn.question_type::text
                  ) IN (
                    'AUDIO',
                    'VOICE_NOTE'
                  )

                  AND tan.score IS NULL
              )
              THEN NULL

              ELSE ts.audio_score

            END

            ELSE NULL

          END AS nilai_tes

        FROM latest_attempts la

        LEFT JOIN test_types tt
          ON tt.test_id =
             la.test_id

        LEFT JOIN test_scores ts
          ON ts.attempt_id =
             la.id
      )

      SELECT

        COUNT(*)::INTEGER
          AS total_tests,

        COUNT(*) FILTER (
          WHERE status =
                'completed'
        )::INTEGER
          AS completed_tests,

        COUNT(nilai_tes)::INTEGER
          AS scored_tests,

        COUNT(*) FILTER (
          WHERE status <>
                'completed'
        )::INTEGER
          AS incomplete_tests,

        COUNT(*) FILTER (
          WHERE pending_review =
                TRUE
        )::INTEGER
          AS pending_tests,

        ROUND(
          AVG(nilai_tes)::NUMERIC,
          2
        ) AS total_score

      FROM per_test
    `;

    const summaryResult =
      await pool.query(
        summaryQuery,
        [candidateId]
      );

    const summary =
      summaryResult.rows[0] ||
      {};

    const totalTests =
      Number(
        summary.total_tests ??
          0
      );

    const completedTests =
      Number(
        summary.completed_tests ??
          0
      );

    const scoredTests =
      Number(
        summary.scored_tests ??
          0
      );

    const incompleteTests =
      Number(
        summary.incomplete_tests ??
          0
      );

    const pendingTests =
      Number(
        summary.pending_tests ??
          0
      );

    const totalScore =
      summary.total_score !== null &&
      summary.total_score !== undefined
        ? Number(
            summary.total_score
          )
        : null;

    const passingScore =
      await this.getPassingScore();

    let finalStatus:
      CandidateResultStatus;

    if (
      totalTests === 0 ||
      scoredTests === 0 ||
      incompleteTests > 0 ||
      pendingTests > 0 ||
      totalScore === null
    ) {
      finalStatus =
        "Perlu Review";
    } else if (
      totalScore >=
      passingScore
    ) {
      finalStatus =
        "Lolos";
    } else {
      finalStatus =
        "Tidak Lolos";
    }

    const existingResult =
      await pool.query(
        `
          SELECT
            id,
            catatan,
            decision

          FROM assessment_results

          WHERE apply_id = $1

          ORDER BY
            updated_at
            DESC NULLS LAST

          LIMIT 1
        `,
        [
          numericApplyId,
        ]
      );

    let saved: any;

    if (
      existingResult.rows.length
    ) {
      const existing =
        existingResult
          .rows[0];

      const savedResult =
        await pool.query(
          `
            UPDATE assessment_results

            SET

              total_score = $1,

              passing_score = $2,

              status = CASE

                WHEN decision IN (
                  'with_note',
                  'without_note'
                )
                  AND $1 IS NOT NULL
                  AND $6 >= $5
                  AND $7 >= $5
                THEN 'Lolos'

                ELSE $3

              END,

              passed = CASE

                WHEN decision IN (
                  'with_note',
                  'without_note'
                )
                  AND $1 IS NOT NULL
                  AND $6 >= $5
                  AND $7 >= $5
                THEN TRUE

                ELSE $4

              END,

              total_tests = $5,
              completed_tests = $6,
              scored_tests = $7,

              catatan = CASE

                WHEN decision =
                     'with_note'
                THEN catatan

                WHEN decision =
                     'without_note'
                THEN NULL

                WHEN $3 =
                     'Lolos'
                THEN catatan

                ELSE NULL

              END,

              updated_at = NOW()

            WHERE id = $8

            RETURNING *
          `,
          [
            totalScore,

            passingScore,

            finalStatus,

            finalStatus ===
            "Lolos"
              ? true
              : finalStatus ===
                  "Tidak Lolos"
                ? false
                : null,

            totalTests,
            completedTests,
            scoredTests,

            existing.id,
          ]
        );

      saved =
        savedResult.rows[0] ||
        null;
    } else {
      const savedResult =
        await pool.query(
          `
            INSERT INTO assessment_results (
              apply_id,
              total_score,
              passing_score,
              status,
              passed,
              total_tests,
              completed_tests,
              scored_tests,
              decision,
              catatan,
              created_at,
              updated_at
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
              NULL,
              NULL,
              NOW(),
              NOW()
            )

            RETURNING *
          `,
          [
            numericApplyId,

            totalScore,

            passingScore,

            finalStatus,

            finalStatus ===
            "Lolos"
              ? true
              : finalStatus ===
                  "Tidak Lolos"
                ? false
                : null,

            totalTests,
            completedTests,
            scoredTests,
          ]
        );

      saved =
        savedResult.rows[0] ||
        null;
    }

    return saved;
  }

  // ============================================================
  // DETAIL HASIL TES
  // ============================================================

  async findById(
    attemptId: string
  ) {
    if (!attemptId) {
      throw new Error(
        "Attempt ID wajib diisi"
      );
    }

    const detailQuery = `
      SELECT

        ta.id AS attempt_id,
        ta.candidate_id,
        ta.test_id,
        ta.started_at,
        ta.finished_at,
        ta.status AS attempt_status,

        ts.id AS score_id,
        ts.multiple_choice_score,
        ts.essay_score,
        ts.audio_score,
        ts.total_score,

        qt.question_type,
        qt.type_count,

        CASE

          WHEN qt.type_count <> 1
          THEN NULL

          WHEN qt.question_type =
               'MULTIPLE_CHOICE'
          THEN ts.multiple_choice_score

          WHEN qt.question_type =
               'ESSAY'
          THEN CASE

            WHEN EXISTS (
              SELECT 1

              FROM test_answers pta

              JOIN questions pq
                ON pq.id =
                   pta.question_id

              WHERE pta.attempt_id =
                    ta.id

                AND UPPER(
                  pq.question_type::text
                ) IN (
                  'ESSAY',
                  'ESAI'
                )

                AND pta.score IS NULL
            )
            THEN NULL

            ELSE ts.essay_score

          END

          WHEN qt.question_type =
               'AUDIO'
          THEN CASE

            WHEN EXISTS (
              SELECT 1

              FROM test_answers pta

              JOIN questions pq
                ON pq.id =
                   pta.question_id

              WHERE pta.attempt_id =
                    ta.id

                AND UPPER(
                  pq.question_type::text
                ) IN (
                  'AUDIO',
                  'VOICE_NOTE'
                )

                AND pta.score IS NULL
            )
            THEN NULL

            ELSE ts.audio_score

          END

          ELSE NULL

        END AS nilai_tes,

        ja.id AS apply_id,
        ja.nama_lengkap,
        ja.email,
        ja.no_hp,
        ja.posisi AS posisi_apply,
        ja.lembaga,
        ja.lokasi,

        l.title AS posisi_lowongan,
        l.perusahaan,
        l.lokasi AS lokasi_lowongan,

        t.title AS test_name,
        t.passing_score,

        ar.total_score AS final_total_score,
        ar.passing_score AS final_passing_score,
        ar.status AS final_status,
        ar.decision AS final_decision,
        ar.passed AS final_passed,
        ar.catatan AS final_catatan,
        ar.total_tests AS final_total_tests,
        ar.completed_tests AS final_completed_tests,
        ar.scored_tests AS final_scored_tests

      FROM test_attempts ta

      LEFT JOIN test_scores ts
        ON ts.attempt_id =
           ta.id

      LEFT JOIN job_applies ja
        ON ja.user_id =
           ta.candidate_id

      LEFT JOIN lowongans l
        ON l.id =
           ja.lowongan_id

      LEFT JOIN tests t
        ON t.id =
           ta.test_id

      LEFT JOIN LATERAL (
        SELECT

          COUNT(
            DISTINCT CASE

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'MULTIPLE_CHOICE',
                'PILIHAN_GANDA'
              )
              THEN 'MULTIPLE_CHOICE'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'ESSAY',
                'ESAI'
              )
              THEN 'ESSAY'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'AUDIO',
                'VOICE_NOTE'
              )
              THEN 'AUDIO'

              ELSE UPPER(
                q.question_type::text
              )

            END
          ) AS type_count,

          MAX(
            CASE

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'MULTIPLE_CHOICE',
                'PILIHAN_GANDA'
              )
              THEN 'MULTIPLE_CHOICE'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'ESSAY',
                'ESAI'
              )
              THEN 'ESSAY'

              WHEN UPPER(
                q.question_type::text
              ) IN (
                'AUDIO',
                'VOICE_NOTE'
              )
              THEN 'AUDIO'

              ELSE UPPER(
                q.question_type::text
              )

            END
          ) AS question_type

        FROM questions q

        WHERE q.test_id =
              ta.test_id
      ) qt
        ON TRUE

      LEFT JOIN LATERAL (
        SELECT ar1.*

        FROM assessment_results ar1

        WHERE ar1.apply_id =
              ja.id

        ORDER BY
          ar1.updated_at
          DESC NULLS LAST

        LIMIT 1
      ) ar
        ON TRUE

      WHERE ta.id = $1

      LIMIT 1
    `;

    const detailResult =
      await pool.query(
        detailQuery,
        [attemptId]
      );

    if (
      !detailResult.rows.length
    ) {
      return null;
    }

    const row =
      detailResult.rows[0];

    const answersQuery = `
      SELECT

        ta.id,
        ta.attempt_id,
        ta.question_id,
        ta.selected_option_id,
        ta.answer_text,
        ta.answer_image,
        ta.answer_audio,
        ta.score,
        ta.created_at,

        q.question_text,
        q.question_type::text
          AS question_type,

        qo.option_text
          AS selected_option_text

      FROM test_answers ta

      LEFT JOIN questions q
        ON q.id =
           ta.question_id

      LEFT JOIN question_options qo
        ON qo.id =
           ta.selected_option_id

      WHERE ta.attempt_id =
            $1

      ORDER BY
        ta.created_at ASC
    `;

    const answersResult =
      await pool.query(
        answersQuery,
        [attemptId]
      );

    const jawabanList =
      answersResult.rows.map(
        (answer) => {
          const questionType =
            this.normalizeQuestionType(
              answer.question_type
            );

          let jawabanUser:
            | string
            | null = null;

          if (
            this.isMultipleChoice(
              questionType
            )
          ) {
            jawabanUser =
              answer.selected_option_text ??
              answer.answer_text ??
              null;
          } else {
            jawabanUser =
              answer.answer_text ??
              null;
          }

          if (
            typeof jawabanUser ===
              "string" &&
            jawabanUser.trim() ===
              ""
          ) {
            jawabanUser = null;
          }

          const nilai =
            answer.score !== null &&
            answer.score !== undefined
              ? Number(
                  answer.score
                )
              : null;

          const pendingManual =
            this.isManualReviewType(
              questionType
            ) &&
            nilai === null;

          return {
            id:
              answer.id,

            attemptId:
              answer.attempt_id,

            soalId:
              answer.question_id,

            pertanyaan:
              answer.question_text ||
              "-",

            tipe:
              questionType ||
              "UNKNOWN",

            jawabanUser,

            answerText:
              answer.answer_text ??
              null,

            answerImage:
              answer.answer_image ??
              null,

            answerAudio:
              answer.answer_audio ??
              null,

            selectedOptionId:
              answer.selected_option_id ??
              null,

            selectedOptionText:
              answer.selected_option_text ??
              null,

            nilai,

            nilaiBaru:
              nilai,

            status:
              nilai !== null
                ? "reviewed"
                : pendingManual
                  ? "pending"
                  : "auto",

            scoreStatus:
              nilai !== null
                ? "reviewed"
                : pendingManual
                  ? "pending"
                  : "auto",
          };
        }
      );

    const pendingReviewResult =
      await pool.query(
        `
          SELECT EXISTS (
            SELECT 1

            FROM test_answers ta

            JOIN questions q
              ON q.id =
                 ta.question_id

            WHERE ta.attempt_id =
                  $1

              AND UPPER(
                q.question_type::text
              ) IN (
                'ESSAY',
                'ESAI',
                'AUDIO',
                'VOICE_NOTE'
              )

              AND ta.score IS NULL

          ) AS pending_review
        `,
        [attemptId]
      );

    const pendingReview =
      pendingReviewResult
        .rows[0]
        ?.pending_review === true;

    const finalStatus =
      row.final_status ||
      "Perlu Review";

    return {
      id:
        row.attempt_id,

      attemptId:
        row.attempt_id,

      applyId:
        row.apply_id ??
        null,

      candidateId:
        row.candidate_id,

      testId:
        row.test_id,

      kandidatNama:
        row.nama_lengkap ||
        "-",

      email:
        row.email ||
        "-",

      noHp:
        row.no_hp ||
        "-",

      posisi:
        row.posisi_lowongan ||
        row.posisi_apply ||
        "-",

      lembaga:
        row.perusahaan ||
        row.lembaga ||
        "-",

      lokasi:
        row.lokasi_lowongan ||
        row.lokasi ||
        "-",

      materiNama:
        row.test_name ||
        "-",

      tanggalTes:
        row.finished_at ||
        row.started_at ||
        null,

      startedAt:
        row.started_at ||
        null,

      finishedAt:
        row.finished_at ||
        null,

      attemptStatus:
        row.attempt_status ||
        "unknown",

      questionType:
        row.question_type ||
        null,

      multipleChoiceScore:
        row.multiple_choice_score !== null &&
        row.multiple_choice_score !== undefined
          ? Number(
              row.multiple_choice_score
            )
          : null,

      essayScore:
        row.essay_score !== null &&
        row.essay_score !== undefined
          ? Number(
              row.essay_score
            )
          : null,

      audioScore:
        row.audio_score !== null &&
        row.audio_score !== undefined
          ? Number(
              row.audio_score
            )
          : null,

      totalNilai:
        row.nilai_tes !== null &&
        row.nilai_tes !== undefined
          ? Number(
              row.nilai_tes
            )
          : null,

      passingScore:
        row.passing_score !== null &&
        row.passing_score !== undefined
          ? Number(
              row.passing_score
            )
          : 70,

      finalTotalNilai:
        row.final_total_score !== null &&
        row.final_total_score !== undefined
          ? Number(
              row.final_total_score
            )
          : null,

      finalPassingScore:
        row.final_passing_score !== null &&
        row.final_passing_score !== undefined
          ? Number(
              row.final_passing_score
            )
          : 70,

      finalStatus,

      finalTotalTests:
        row.final_total_tests !== null &&
        row.final_total_tests !== undefined
          ? Number(
              row.final_total_tests
            )
          : 0,

      finalCompletedTests:
        row.final_completed_tests !== null &&
        row.final_completed_tests !== undefined
          ? Number(
              row.final_completed_tests
            )
          : 0,

      finalScoredTests:
        row.final_scored_tests !== null &&
        row.final_scored_tests !== undefined
          ? Number(
              row.final_scored_tests
            )
          : 0,

      catatan:
        row.final_catatan ??
        null,

      decision:
        this.normalizeDecision(
          row.final_decision
        ),

      passed:
        row.final_passed !== null &&
        row.final_passed !== undefined
          ? row.final_passed === true
          : finalStatus ===
              "Lolos"
            ? true
            : finalStatus ===
                "Tidak Lolos"
              ? false
              : null,

      status:
        pendingReview
          ? "Perlu Review"
          : row.attempt_status ===
              "completed"
            ? "Selesai"
            : "Perlu Review",

      jawabanList,
    };
  }

  // ============================================================
  // UPDATE NILAI ANSWER
  // ============================================================

  async updateAnswerScore(
    answerId: string,
    score: number
  ) {
    if (!answerId) {
      throw new Error(
        "Answer ID wajib diisi"
      );
    }

    const numericScore =
      Number(score);

    if (
      !Number.isFinite(
        numericScore
      )
    ) {
      throw new Error(
        "Nilai harus berupa angka"
      );
    }

    if (
      numericScore < 0 ||
      numericScore > 100
    ) {
      throw new Error(
        "Nilai harus berada di antara 0 sampai 100"
      );
    }

    const result =
      await pool.query(
        `
          UPDATE test_answers

          SET score = $1

          WHERE id = $2

          RETURNING *
        `,
        [
          numericScore,
          answerId,
        ]
      );

    return (
      result.rows[0] ||
      null
    );
  }

  // ============================================================
  // UPDATE NILAI SOAL ESSAY / AUDIO
  // ============================================================

  async updateQuestionScore(
    attemptId: string,
    questionId: string,
    score: number
  ) {
    if (!attemptId) {
      throw new Error(
        "Attempt ID wajib diisi"
      );
    }

    if (!questionId) {
      throw new Error(
        "Question ID wajib diisi"
      );
    }

    const numericScore =
      Number(score);

    if (
      !Number.isFinite(
        numericScore
      )
    ) {
      throw new Error(
        "Nilai harus berupa angka"
      );
    }

    if (
      numericScore < 0 ||
      numericScore > 100
    ) {
      throw new Error(
        "Nilai harus berada di antara 0 sampai 100"
      );
    }

    const result =
      await pool.query(
        `
          UPDATE test_answers ta

          SET score = $1

          FROM questions q

          WHERE ta.attempt_id = $2

            AND ta.question_id = $3

            AND q.id =
                ta.question_id

            AND UPPER(
              q.question_type::text
            ) IN (
              'ESSAY',
              'ESAI',
              'AUDIO',
              'VOICE_NOTE'
            )

          RETURNING ta.*
        `,
        [
          numericScore,
          attemptId,
          questionId,
        ]
      );

    if (
      !result.rows.length
    ) {
      return null;
    }

    return result.rows[0];
  }

  // ============================================================
  // RECALCULATE SCORE SATU TES
  // ============================================================

  async recalculateScore(
    attemptId: string
  ) {
    if (!attemptId) {
      throw new Error(
        "Attempt ID wajib diisi"
      );
    }

    const typeResult =
      await pool.query(
        `
          SELECT

            COUNT(
              DISTINCT CASE

                WHEN UPPER(
                  q.question_type::text
                ) IN (
                  'MULTIPLE_CHOICE',
                  'PILIHAN_GANDA'
                )
                THEN 'MULTIPLE_CHOICE'

                WHEN UPPER(
                  q.question_type::text
                ) IN (
                  'ESSAY',
                  'ESAI'
                )
                THEN 'ESSAY'

                WHEN UPPER(
                  q.question_type::text
                ) IN (
                  'AUDIO',
                  'VOICE_NOTE'
                )
                THEN 'AUDIO'

                ELSE UPPER(
                  q.question_type::text
                )

              END
            ) AS type_count,

            MAX(
              CASE

                WHEN UPPER(
                  q.question_type::text
                ) IN (
                  'MULTIPLE_CHOICE',
                  'PILIHAN_GANDA'
                )
                THEN 'MULTIPLE_CHOICE'

                WHEN UPPER(
                  q.question_type::text
                ) IN (
                  'ESSAY',
                  'ESAI'
                )
                THEN 'ESSAY'

                WHEN UPPER(
                  q.question_type::text
                ) IN (
                  'AUDIO',
                  'VOICE_NOTE'
                )
                THEN 'AUDIO'

                ELSE UPPER(
                  q.question_type::text
                )

              END
            ) AS question_type

          FROM questions q

          JOIN test_attempts ta
            ON ta.test_id =
               q.test_id

          WHERE ta.id = $1
        `,
        [attemptId]
      );

    const typeCount =
      Number(
        typeResult.rows[0]
          ?.type_count ??
          0
      );

    const questionType =
      typeResult.rows[0]
        ?.question_type ??
      null;

    if (
      typeCount !== 1
    ) {
      throw new Error(
        "Satu tes harus memiliki tepat satu jenis soal"
      );
    }

    const breakdownResult =
      await pool.query(
        `
          SELECT

            AVG(
              CASE

                WHEN UPPER(
                  q.question_type::text
                ) IN (
                  'MULTIPLE_CHOICE',
                  'PILIHAN_GANDA'
                )
                THEN ta.score

                ELSE NULL

              END
            ) AS multiple_choice,

            AVG(
              CASE

                WHEN UPPER(
                  q.question_type::text
                ) IN (
                  'ESSAY',
                  'ESAI'
                )
                THEN ta.score

                ELSE NULL

              END
            ) AS essay,

            AVG(
              CASE

                WHEN UPPER(
                  q.question_type::text
                ) IN (
                  'AUDIO',
                  'VOICE_NOTE'
                )
                THEN ta.score

                ELSE NULL

              END
            ) AS audio,

            BOOL_OR(
              UPPER(
                q.question_type::text
              ) IN (
                'ESSAY',
                'ESAI',
                'AUDIO',
                'VOICE_NOTE'
              )
              AND ta.score IS NULL
            ) AS pending_manual

          FROM test_answers ta

          LEFT JOIN questions q
            ON q.id =
               ta.question_id

          WHERE ta.attempt_id =
                $1
        `,
        [attemptId]
      );

    const breakdown =
      breakdownResult.rows[0] ||
      {};

    const pendingManual =
      breakdown.pending_manual ===
      true;

    const avgMultipleChoice =
      breakdown.multiple_choice !==
        null &&
      breakdown.multiple_choice !==
        undefined
        ? Math.round(
            Number(
              breakdown.multiple_choice
            )
          )
        : 0;

    const avgEssay =
      breakdown.essay !== null &&
      breakdown.essay !== undefined
        ? Math.round(
            Number(
              breakdown.essay
            )
          )
        : 0;

    const avgAudio =
      breakdown.audio !== null &&
      breakdown.audio !== undefined
        ? Math.round(
            Number(
              breakdown.audio
            )
          )
        : 0;

    const finalMultipleChoice =
      questionType ===
      "MULTIPLE_CHOICE"
        ? avgMultipleChoice
        : 0;

    const finalEssay =
      questionType ===
      "ESSAY"
        ? pendingManual
          ? 0
          : avgEssay
        : 0;

    const finalAudio =
      questionType ===
      "AUDIO"
        ? pendingManual
          ? 0
          : avgAudio
        : 0;

    const updateResult =
      await pool.query(
        `
          UPDATE test_scores

          SET
            multiple_choice_score = $1,
            essay_score = $2,
            audio_score = $3

          WHERE attempt_id = $4

          RETURNING *
        `,
        [
          finalMultipleChoice,
          finalEssay,
          finalAudio,
          attemptId,
        ]
      );

    return (
      updateResult.rows[0] ||
      null
    );
  }

  // ============================================================
  // DELETE ATTEMPT
  // ============================================================

  async delete(
    attemptId: string
  ) {
    if (!attemptId) {
      throw new Error(
        "Attempt ID wajib diisi"
      );
    }

    const client =
      await pool.connect();

    try {
      await client.query(
        "BEGIN"
      );

      await client.query(
        `
          DELETE FROM test_scores

          WHERE attempt_id = $1
        `,
        [attemptId]
      );

      await client.query(
        `
          DELETE FROM test_answers

          WHERE attempt_id = $1
        `,
        [attemptId]
      );

      const result =
        await client.query(
          `
            DELETE FROM test_attempts

            WHERE id = $1

            RETURNING id
          `,
          [attemptId]
        );

      await client.query(
        "COMMIT"
      );

      return (
        result.rows[0] ||
        null
      );
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      throw error;
    } finally {
      client.release();
    }
  }
}

export const hasilTesRepository =
  new HasilTesRepository();