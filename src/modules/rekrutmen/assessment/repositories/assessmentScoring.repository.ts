import pool from "../../../../config/db";

export interface AssessmentScoringConfigRow {
  id: string;
  testId: string;
  componentId: string;
  componentName: string;
  componentCode: string;
  weight: number;
}

export interface AssessmentScoringWeight {
  componentId: string;
  code: string;
  weight: number;
}

export interface AssessmentScoringConfigInput {
  componentId: string;
  weight: number;
}

export interface ActiveAssessmentComponent {
  id: string;
  name: string;
  code: string;
  weight: number;
  defaultWeight: number;
  isActive: boolean;
  sortOrder: number;
}

class AssessmentScoringRepository {
  /**
   * Ambil konfigurasi scoring berdasarkan test.
   */
  async findByTestId(
    testId: string
  ): Promise<AssessmentScoringConfigRow[]> {
    const result = await pool.query(
      `
      SELECT
        tsc.id,
        tsc.test_id,
        tsc.component_id,
        ac.name AS component_name,
        ac.code AS component_code,
        tsc.weight
      FROM test_scoring_configs tsc
      INNER JOIN assessment_components ac
        ON ac.id = tsc.component_id
      WHERE tsc.test_id = $1
      ORDER BY ac.sort_order ASC, ac.name ASC
      `,
      [testId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      testId: row.test_id,
      componentId: row.component_id,
      componentName: row.component_name,
      componentCode: row.component_code,
      weight: Number(row.weight),
    }));
  }

  /**
   * Ambil komponen assessment aktif.
   */
  async findActiveComponents(): Promise<ActiveAssessmentComponent[]> {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        code,
        weight,
        is_active,
        sort_order
      FROM assessment_components
      WHERE is_active = true
      ORDER BY sort_order ASC, name ASC
      `
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      weight: Number(row.weight),
      defaultWeight: Number(row.weight),
      isActive: Boolean(row.is_active),
      sortOrder: Number(row.sort_order),
    }));
  }

  /**
   * Cek apakah test tersedia.
   */
  async testExists(testId: string): Promise<boolean> {
    const result = await pool.query(
      `
      SELECT 1
      FROM tests
      WHERE id = $1
      LIMIT 1
      `,
      [testId]
    );

    return result.rowCount === 1;
  }

  /**
   * Cek seluruh component id tersedia.
   */
  async componentsExist(componentIds: string[]): Promise<boolean> {
    if (componentIds.length === 0) {
      return false;
    }

    const result = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM assessment_components
      WHERE id = ANY($1::uuid[])
      `,
      [componentIds]
    );

    return Number(result.rows[0]?.total || 0) === componentIds.length;
  }

  /**
   * Ambil hanya weight untuk scoring berdasarkan test.
   */
  async findWeightsByTestId(
    testId: string
  ): Promise<AssessmentScoringWeight[]> {
    const result = await pool.query(
      `
      SELECT
        tsc.component_id,
        ac.code,
        tsc.weight
      FROM test_scoring_configs tsc
      INNER JOIN assessment_components ac
        ON ac.id = tsc.component_id
      WHERE tsc.test_id = $1
      ORDER BY ac.sort_order ASC, ac.name ASC
      `,
      [testId]
    );

    return result.rows.map((row) => ({
      componentId: row.component_id,
      code: row.code,
      weight: Number(row.weight),
    }));
  }

  /**
   * Simpan ulang konfigurasi scoring sebuah test.
   */
  async replaceForTest(
    testId: string,
    configs: AssessmentScoringConfigInput[]
  ): Promise<AssessmentScoringConfigRow[]> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
        DELETE FROM test_scoring_configs
        WHERE test_id = $1
        `,
        [testId]
      );

      for (const config of configs) {
        await client.query(
          `
          INSERT INTO test_scoring_configs (
            test_id,
            component_id,
            weight
          )
          VALUES ($1, $2, $3)
          `,
          [
            testId,
            config.componentId,
            config.weight,
          ]
        );
      }

      await client.query("COMMIT");

      return await this.findByTestId(testId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Pastikan komponen online test tersedia.
   *
   * PERBAIKAN:
   *
   * Default weight diubah dari 50/30/20 menjadi 100/100/100.
   *
   * Karena perhitungan total nilai di findResults() sekarang
   * memakai RATA-RATA SEDERHANA (bukan weighted),
   * bobot semua komponen = 100 supaya konsisten.
   */
  async ensureOnlineComponents(): Promise<void> {
    const onlineComponents = [
      {
        code: "MULTIPLE_CHOICE",
        name: "Pilihan Ganda",
        weight: 100,
        sortOrder: 10,
      },
      {
        code: "ESSAY",
        name: "Essay",
        weight: 100,
        sortOrder: 11,
      },
      {
        code: "AUDIO",
        name: "Audio",
        weight: 100,
        sortOrder: 12,
      },
    ];

    for (const component of onlineComponents) {
      const existing = await pool.query(
        `
        SELECT id
        FROM assessment_components
        WHERE code = $1
        LIMIT 1
        `,
        [component.code]
      );

      if (existing.rowCount === 0) {
        await pool.query(
          `
          INSERT INTO assessment_components (
            name,
            code,
            weight,
            is_active,
            sort_order
          )
          VALUES ($1, $2, $3, true, $4)
          `,
          [
            component.name,
            component.code,
            component.weight,
            component.sortOrder,
          ]
        );
      }
    }
  }

  /**
   * Pastikan sebuah test mempunyai konfigurasi
   * MULTIPLE_CHOICE, ESSAY, AUDIO.
   *
   * Config yang sudah ada TIDAK ditimpa.
   *
   * PERBAIKAN:
   *
   * Default weight diubah dari 50/30/20 menjadi 100/100/100.
   */
  async ensureDefaultOnlineConfig(testId: string): Promise<void> {
    const testExists = await this.testExists(testId);

    if (!testExists) {
      throw new Error("Test tidak ditemukan.");
    }

    await this.ensureOnlineComponents();

    const onlineComponents = [
      {
        code: "MULTIPLE_CHOICE",
        weight: 100,
      },
      {
        code: "ESSAY",
        weight: 100,
      },
      {
        code: "AUDIO",
        weight: 100,
      },
    ];

    for (const item of onlineComponents) {
      const componentResult = await pool.query(
        `
        SELECT id
        FROM assessment_components
        WHERE code = $1
        LIMIT 1
        `,
        [item.code]
      );

      if (componentResult.rowCount === 0) {
        throw new Error(
          `Komponen assessment ${item.code} tidak ditemukan.`
        );
      }

      const componentId = componentResult.rows[0].id;

      await pool.query(
        `
        INSERT INTO test_scoring_configs (
          test_id,
          component_id,
          weight
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (test_id, component_id)
        DO NOTHING
        `,
        [
          testId,
          componentId,
          item.weight,
        ]
      );
    }
  }
}

export const assessmentScoringRepository =
  new AssessmentScoringRepository();