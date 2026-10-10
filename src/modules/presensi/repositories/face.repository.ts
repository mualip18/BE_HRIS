import db from "../../../config/db";

export interface EmployeeFaceRecord {
  id: string;
  employeeId: string;
  embedding: number[];
  fotoPath: string | null;
  status: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

class FaceRepository {
  private mapRow(row: any): EmployeeFaceRecord {
    let embedding: number[] = [];

    if (Array.isArray(row.embedding)) {
      embedding =
        row.embedding.map(Number);
    } else if (
      typeof row.embedding === "string"
    ) {
      try {
        const parsed =
          JSON.parse(row.embedding);

        if (Array.isArray(parsed)) {
          embedding =
            parsed.map(Number);
        }
      } catch {
        embedding = [];
      }
    }

    return {
      id: String(row.id),

      employeeId:
        String(row.employee_id),

      embedding,

      fotoPath:
        row.foto_path ?? null,

      status:
        row.status,

      verifiedAt:
        row.verified_at
          ? String(row.verified_at)
          : null,

      createdAt:
        String(row.created_at),

      updatedAt:
        String(row.updated_at),
    };
  }

  async getByEmployeeId(
    employeeId: string
  ): Promise<EmployeeFaceRecord | null> {
    const result = await db.query(
      `
        SELECT
          id,
          employee_id,
          embedding,
          foto_path,
          status,
          verified_at,
          created_at,
          updated_at

        FROM hris_employee_faces

        WHERE
          employee_id = $1

          AND status = 'ACTIVE'

        ORDER BY
          updated_at DESC

        LIMIT 1
      `,
      [employeeId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(
      result.rows[0]
    );
  }

  async upsert(
    employeeId: string,
    embedding: number[],
    fotoPath: string | null
  ) {
    const result = await db.query(
      `
        INSERT INTO hris_employee_faces (
          employee_id,
          embedding,
          foto_path,
          status,
          verified_at,
          created_at,
          updated_at
        )

        VALUES (
          $1,
          $2::jsonb,
          $3,
          'ACTIVE',
          NOW(),
          NOW(),
          NOW()
        )

        ON CONFLICT (employee_id)

        DO UPDATE SET
          embedding =
            EXCLUDED.embedding,

          foto_path =
            EXCLUDED.foto_path,

          status =
            'ACTIVE',

          verified_at =
            NOW(),

          updated_at =
            NOW()

        RETURNING
          id,
          employee_id,
          embedding,
          foto_path,
          status,
          verified_at,
          created_at,
          updated_at
      `,
      [
        employeeId,
        JSON.stringify(embedding),
        fotoPath,
      ]
    );

    return this.mapRow(
      result.rows[0]
    );
  }

  async deactivate(
    employeeId: string
  ) {
    await db.query(
      `
        UPDATE hris_employee_faces

        SET
          status = 'INACTIVE',
          updated_at = NOW()

        WHERE
          employee_id = $1
      `,
      [employeeId]
    );
  }
}

export default new FaceRepository();