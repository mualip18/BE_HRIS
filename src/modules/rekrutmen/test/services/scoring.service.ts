import pool from '../../../../config/db';
import { TestScore } from '../types';

export class ScoringService {

  async calculateAndSaveScores(
    attemptId: string,
    client?: any
  ): Promise<TestScore> {

    const db = client || pool;

    console.log('====================================');
    console.log('SCORING TEST');
    console.log('ATTEMPT ID:', attemptId);
    console.log('====================================');

    // =========================================================
    // 1. AMBIL TEST ID DARI ATTEMPT
    // =========================================================

    const attemptResult = await db.query(
      `
      SELECT
        id,
        test_id,
        candidate_id,
        status
      FROM test_attempts
      WHERE id = $1
      LIMIT 1
      `,
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      throw new Error(
        `Attempt tidak ditemukan: ${attemptId}`
      );
    }

    const attempt = attemptResult.rows[0];

    const testId = attempt.test_id;

    console.log('TEST ID:', testId);
    console.log('CANDIDATE ID:', attempt.candidate_id);

    // =========================================================
    // 2. AMBIL SEMUA SOAL PILIHAN GANDA
    //
    // PENTING:
    // Denominator menggunakan SEMUA soal PG,
    // bukan hanya soal yang dijawab kandidat.
    // =========================================================

    const multipleChoiceQuestions = await db.query(
      `
      SELECT
        id,
        question_type,
        score
      FROM questions
      WHERE test_id = $1
        AND question_type = 'MULTIPLE_CHOICE'
        AND is_active = true
      ORDER BY sort_order, created_at
      `,
      [testId]
    );

    const totalMultipleChoiceQuestions =
      multipleChoiceQuestions.rows.length;

    console.log(
      'TOTAL MULTIPLE CHOICE QUESTIONS:',
      totalMultipleChoiceQuestions
    );

    // =========================================================
    // 3. AMBIL SEMUA JAWABAN KANDIDAT
    // =========================================================

    const answers = await db.query(
      `
      SELECT
        ta.id,
        ta.attempt_id,
        ta.question_id,
        ta.selected_option_id,
        ta.answer_text,
        ta.answer_audio,
        ta.score AS answer_score,

        q.question_type,
        q.score AS question_max_score,

        CASE
          WHEN qo.id IS NOT NULL
            AND qo.is_correct = true
          THEN true
          ELSE false
        END AS is_correct

      FROM test_answers ta

      INNER JOIN questions q
        ON q.id = ta.question_id

      LEFT JOIN question_options qo
        ON qo.id = ta.selected_option_id
        AND qo.question_id = ta.question_id

      WHERE ta.attempt_id = $1
      `,
      [attemptId]
    );

    console.log(
      'TOTAL ANSWERS:',
      answers.rows.length
    );

    // =========================================================
    // 4. NILAI AWAL
    // =========================================================

    let correctMultipleChoice = 0;

    let essayScore = 0;

    let audioScore = 0;

    // =========================================================
    // 5. HITUNG JAWABAN BENAR
    // =========================================================

    for (const answer of answers.rows) {

      // =======================================================
      // MULTIPLE CHOICE
      // =======================================================

      if (
        answer.question_type ===
        'MULTIPLE_CHOICE'
      ) {

        const isCorrect =
          answer.is_correct === true ||
          answer.is_correct === 'true';

        if (isCorrect) {

          correctMultipleChoice++;

          console.log(
            'CORRECT:',
            answer.question_id,
            'OPTION:',
            answer.selected_option_id
          );

        } else {

          console.log(
            'WRONG:',
            answer.question_id,
            'OPTION:',
            answer.selected_option_id
          );
        }
      }

      // =======================================================
      // ESSAY
      // =======================================================

      else if (
        answer.question_type === 'ESSAY'
      ) {

        /*
         * Essay tidak dinilai otomatis.
         *
         * Kalau HR sudah memberikan nilai manual
         * pada test_answers.score, gunakan nilai tersebut.
         *
         * Kalau belum ada nilai:
         * otomatis 0.
         */

        const manualScore =
          Number(answer.answer_score || 0);

        essayScore += manualScore;
      }

      // =======================================================
      // AUDIO / VOICE
      // =======================================================

      else if (
        answer.question_type === 'AUDIO' ||
        answer.question_type === 'VOICE'
      ) {

        /*
         * Audio / Voice tidak dinilai otomatis.
         *
         * Kalau HR sudah memberikan nilai manual
         * pada test_answers.score, gunakan nilai tersebut.
         *
         * Kalau belum ada:
         * otomatis 0.
         */

        const manualScore =
          Number(answer.answer_score || 0);

        audioScore += manualScore;
      }
    }

    // =========================================================
    // 6. HITUNG NILAI MULTIPLE CHOICE
    // =========================================================
    //
    // CONTOH:
    //
    // Total soal = 10
    // Benar       = 8
    //
    // 8 / 10 * 100
    // = 80
    //
    // =========================================================

    let multipleChoiceScore = 0;

    if (
      totalMultipleChoiceQuestions > 0
    ) {

      multipleChoiceScore =
        (
          correctMultipleChoice /
          totalMultipleChoiceQuestions
        ) * 100;
    }

    // =========================================================
    // 7. BULATKAN NILAI
    // =========================================================
    //
    // Contoh:
    //
    // 5 / 6 * 100
    // = 83.333333
    //
    // Menjadi:
    // 83.33
    //
    // Karena kolom database kamu INTEGER,
    // kita bulatkan menjadi:
    // 83
    //
    // =========================================================

    multipleChoiceScore =
      Math.round(multipleChoiceScore);

    essayScore =
      Math.round(essayScore);

    audioScore =
      Math.round(audioScore);

    // =========================================================
    // 8. TOTAL SCORE
    // =========================================================

    const totalScore =
      multipleChoiceScore +
      essayScore +
      audioScore;

    console.log('====================================');
    console.log('SCORE RESULT');
    console.log('====================================');

    console.log({
      attemptId,

      totalMultipleChoiceQuestions,

      correctMultipleChoice,

      multipleChoiceScore,

      essayScore,

      audioScore,

      totalScore
    });

    // =========================================================
    // 9. UPDATE SCORE PER JAWABAN MULTIPLE CHOICE
    // =========================================================
    //
    // Setiap soal PG memiliki bobot:
    //
    // 100 / jumlah soal PG
    //
    // Contoh 10 soal:
    // benar = 10 poin
    //
    // Contoh 6 soal:
    // benar = 16.666...
    //
    // Database test_answers.score INTEGER,
    // jadi kita simpan pembulatan.
    //
    // =========================================================

    let pointPerQuestion = 0;

    if (
      totalMultipleChoiceQuestions > 0
    ) {

      pointPerQuestion =
        100 /
        totalMultipleChoiceQuestions;
    }

    for (const answer of answers.rows) {

      if (
        answer.question_type !==
        'MULTIPLE_CHOICE'
      ) {
        continue;
      }

      const isCorrect =
        answer.is_correct === true ||
        answer.is_correct === 'true';

      const answerScore =
        isCorrect
          ? Math.round(pointPerQuestion)
          : 0;

      await db.query(
        `
        UPDATE test_answers
        SET score = $2
        WHERE id = $1
        `,
        [
          answer.id,
          answerScore
        ]
      );
    }

    // =========================================================
    // 10. CEK TEST SCORE SUDAH ADA ATAU BELUM
    // =========================================================

    const existingScore =
      await db.query(
        `
        SELECT id
        FROM test_scores
        WHERE attempt_id = $1
        LIMIT 1
        `,
        [attemptId]
      );

    // =========================================================
    // 11. UPDATE SCORE
    // =========================================================

    if (
      existingScore.rows.length > 0
    ) {

      const update =
        await db.query(
          `
          UPDATE test_scores
          SET
            multiple_choice_score = $2,
            essay_score = $3,
            audio_score = $4

          WHERE attempt_id = $1

          RETURNING *
          `,
          [
            attemptId,
            multipleChoiceScore,
            essayScore,
            audioScore
          ]
        );

      console.log(
        'TEST SCORE UPDATED:',
        update.rows[0]
      );

      return update.rows[0];
    }

    // =========================================================
    // 12. INSERT SCORE BARU
    // =========================================================
    //
    // JANGAN memasukkan total_score.
    //
    // Karena database:
    //
    // total_score GENERATED ALWAYS AS
    // (
    //   (multiple_choice_score + essay_score)
    //   + audio_score
    // )
    //
    // PostgreSQL yang menghitung otomatis.
    //
    // =========================================================

    const insert =
      await db.query(
        `
        INSERT INTO test_scores (
          attempt_id,
          multiple_choice_score,
          essay_score,
          audio_score
        )

        VALUES (
          $1,
          $2,
          $3,
          $4
        )

        RETURNING *
        `,
        [
          attemptId,
          multipleChoiceScore,
          essayScore,
          audioScore
        ]
      );

    console.log(
      'TEST SCORE CREATED:',
      insert.rows[0]
    );

    return insert.rows[0];
  }
}