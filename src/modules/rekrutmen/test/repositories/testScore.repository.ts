import pool from "../../../../config/db";

import {
  TestScore,
} from "../types";

export class TestScoreRepository {

  // =========================================================
  // FIND SCORE BY ATTEMPT
  // =========================================================

  async findByAttemptId(
    attemptId: string
  ): Promise<TestScore | null> {

    const res =
      await pool.query(
        `
        SELECT *
        FROM test_scores
        WHERE attempt_id = $1
        LIMIT 1
        `,
        [attemptId]
      );

    return res.rows[0] || null;
  }


  // =========================================================
  // CREATE SCORE
  // =========================================================

  async create(
    score: Omit<
      TestScore,
      "id" |
      "created_at"
    >
  ): Promise<TestScore> {

    const {
      attempt_id,
      multiple_choice_score,
      essay_score,
      audio_score,
      total_score,
      passed,
    } = score;


    const res =
      await pool.query(
        `
        INSERT INTO test_scores (
          attempt_id,
          multiple_choice_score,
          essay_score,
          audio_score,
          total_score,
          passed
        )

        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )

        RETURNING *
        `,
        [
          attempt_id,
          multiple_choice_score,
          essay_score,
          audio_score,
          total_score ?? null,
          passed ?? null,
        ]
      );


    return res.rows[0];
  }


  // =========================================================
  // UPDATE SCORE
  // =========================================================

  async update(
    attemptId: string,
    multipleChoiceScore: number,
    essayScore: number,
    audioScore: number,
    totalScore: number | null,
    passed: boolean | null
  ): Promise<TestScore> {

    const res =
      await pool.query(
        `
        UPDATE test_scores

        SET
          multiple_choice_score = $2,
          essay_score = $3,
          audio_score = $4,
          total_score = $5,
          passed = $6

        WHERE attempt_id = $1

        RETURNING *
        `,
        [
          attemptId,
          multipleChoiceScore,
          essayScore,
          audioScore,
          totalScore,
          passed,
        ]
      );


    if (
      res.rows.length === 0
    ) {

      throw new Error(
        "Test score tidak ditemukan"
      );
    }


    return res.rows[0];
  }
}