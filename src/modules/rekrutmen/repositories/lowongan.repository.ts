import { Pool } from 'pg';
import pool from '../../../config/db';

import {
  Lowongan,
  CreateLowonganDTO,
  UpdateLowonganDTO,
  LowonganFilter,
} from '../types/lowongan.types';

export class LowonganRepository {

  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // =====================================================
  // GET ALL LOWONGAN
  // =====================================================

  async findAll(
    filter?: LowonganFilter
  ): Promise<Lowongan[]> {

    let query = `
      SELECT 
        l.id,
        l.title,
        l.perusahaan,
        l.divisi,
        l.lokasi,
        l.deskripsi,
        l.tentang_posisi,

        l.kategori_id,
        l.tipe_pekerjaan_id,

        l.gaji_min,
        l.gaji_max,

        l.pengalaman,
        l.pendidikan,

        l.skills,
        l.persyaratan,
        l.tanggung_jawab,
        l.benefit,

        l.deadline,
        l.is_active,

        l.tanggal_posting,
        l.created_at,
        l.updated_at,

        -- CATEGORY
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug,
        c.icon as category_icon,

        -- JOB TYPE
        jt.id as job_type_id,
        jt.name as job_type_name,
        jt.slug as job_type_slug,
        jt.icon as job_type_icon

      FROM lowongans l

      LEFT JOIN categories c
      ON l.kategori_id = c.id

      LEFT JOIN job_types jt
      ON l.tipe_pekerjaan_id = jt.id

      WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    // =====================================================
    // FILTER ACTIVE & DEADLINE
    // =====================================================

    if (!filter?.show_all) {
  query += `
    AND l.is_active = TRUE

    AND (
      l.deadline IS NULL
      OR l.deadline >= CURRENT_DATE
    )
  `;
}

    // =====================================================
    // FILTER KATEGORI
    // =====================================================

    if (filter?.kategori_id) {

      query += `
        AND l.kategori_id = $${paramIndex++}
      `;

      values.push(filter.kategori_id);
    }

    // =====================================================
    // FILTER JOB TYPE
    // =====================================================

    if (filter?.tipe_pekerjaan_id) {

      query += `
        AND l.tipe_pekerjaan_id = $${paramIndex++}
      `;

      values.push(filter.tipe_pekerjaan_id);
    }

    // =====================================================
    // FILTER SEARCH
    // =====================================================

    if (filter?.search) {

      query += `
        AND (
          l.title ILIKE $${paramIndex}
          OR l.perusahaan ILIKE $${paramIndex + 1}
          OR l.deskripsi ILIKE $${paramIndex + 2}
        )
      `;

      const searchTerm = `%${filter.search}%`;

      values.push(
        searchTerm,
        searchTerm,
        searchTerm
      );

      paramIndex += 3;
    }

    // =====================================================
    // ORDERING
    // =====================================================

    query += `
      ORDER BY l.created_at DESC
    `;

    const result =
      await this.db.query(query, values);

    return result.rows.map(
      this.mapRowToLowongan
    );
  }


  // =====================================================
  // GET BY ID
  // =====================================================

  async findById(
    id: number
  ): Promise<Lowongan | null> {

    const query = `
      SELECT 
        l.id,
        l.title,
        l.perusahaan,
        l.divisi,
        l.lokasi,
        l.deskripsi,
        l.tentang_posisi,

        l.kategori_id,
        l.tipe_pekerjaan_id,

        l.gaji_min,
        l.gaji_max,

        l.pengalaman,
        l.pendidikan,

        l.skills,
        l.persyaratan,
        l.tanggung_jawab,
        l.benefit,

        l.deadline,
        l.is_active,

        l.tanggal_posting,
        l.created_at,
        l.updated_at,

        -- CATEGORY
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug,
        c.icon as category_icon,

        -- JOB TYPE
        jt.id as job_type_id,
        jt.name as job_type_name,
        jt.slug as job_type_slug,
        jt.icon as job_type_icon

      FROM lowongans l

      LEFT JOIN categories c
      ON l.kategori_id = c.id

      LEFT JOIN job_types jt
      ON l.tipe_pekerjaan_id = jt.id

      WHERE l.id = $1
    `;

    const result =
      await this.db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToLowongan(
      result.rows[0]
    );
  }


  // =====================================================
  // CREATE LOWONGAN
  // =====================================================

  async create(
    data: CreateLowonganDTO
  ): Promise<Lowongan> {

    const query = `
      INSERT INTO lowongans (

        title,
        perusahaan,
        divisi,
        lokasi,
        deskripsi,
        tentang_posisi,

        kategori_id,
        tipe_pekerjaan_id,

        gaji_min,
        gaji_max,

        pengalaman,
        pendidikan,

        skills,
        persyaratan,
        tanggung_jawab,
        benefit,

        tanggal_posting,
        deadline,
        is_active

      )

      VALUES (

        $1, $2, $3, $4, $5, $6,
        $7, $8,
        $9, $10,
        $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19

      )

      RETURNING *
    `;

    const values = [

      data.title,
      data.perusahaan,

      data.divisi || null,

      data.lokasi,
      data.deskripsi,
      data.tentang_posisi,

      data.kategori_id,
      data.tipe_pekerjaan_id,

      data.gaji_min,
      data.gaji_max,

      data.pengalaman || null,
      data.pendidikan || null,

      JSON.stringify(data.skills || []),
      JSON.stringify(data.persyaratan || []),
      JSON.stringify(data.tanggung_jawab || []),
      JSON.stringify(data.benefit || []),

      new Date(),

      data.deadline || null,

      data.is_active ?? true,
    ];

    const result =
      await this.db.query(query, values);

    return this.findById(result.rows[0].id) as Promise<Lowongan>;
  }


  // =====================================================
  // UPDATE LOWONGAN
  // =====================================================

  async update(
    id: number,
    data: UpdateLowonganDTO
  ): Promise<Lowongan | null> {

    const existing =
      await this.findById(id);

    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];

    let paramIndex = 1;

    const fields = [

      'title',
      'perusahaan',
      'divisi',
      'lokasi',
      'deskripsi',
      'tentang_posisi',

      'kategori_id',
      'tipe_pekerjaan_id',

      'gaji_min',
      'gaji_max',

      'pengalaman',
      'pendidikan',

      'skills',
      'persyaratan',
      'tanggung_jawab',
      'benefit',

      'deadline',
      'is_active',
    ];

    for (const field of fields) {

      const valueData =
        data[field as keyof UpdateLowonganDTO];

      if (valueData !== undefined) {

        updates.push(
          `${field} = $${paramIndex++}`
        );

        let value: any = valueData;

        if (
          [
            'skills',
            'persyaratan',
            'tanggung_jawab',
            'benefit',
          ].includes(field)
        ) {

          value = JSON.stringify(value);
        }

        values.push(value);
      }
    }

    if (updates.length === 0) {
      return null;
    }

    updates.push(
      `updated_at = CURRENT_TIMESTAMP`
    );

    values.push(id);

    const query = `
      UPDATE lowongans

      SET ${updates.join(', ')}

      WHERE id = $${paramIndex}

      RETURNING *
    `;

    const result =
      await this.db.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.findById(result.rows[0].id);
  }


  // =====================================================
  // DELETE LOWONGAN
  // =====================================================

  async delete(
    id: number
  ): Promise<boolean> {

    const query = `
      DELETE FROM lowongans
      WHERE id = $1
    `;

    const result =
      await this.db.query(query, [id]);

    return (result.rowCount ?? 0) > 0;
  }


  // =====================================================
  // MAPPER
  // =====================================================

  private mapRowToLowongan(
    row: any
  ): Lowongan {

    return {

      ...row,

      kategori: row.category_id
        ? {
            id: row.category_id,
            name: row.category_name,
            slug: row.category_slug,
            icon: row.category_icon,
          }
        : undefined,

      tipe_pekerjaan: row.job_type_id
        ? {
            id: row.job_type_id,
            name: row.job_type_name,
            slug: row.job_type_slug,
            icon: row.job_type_icon,
          }
        : undefined,

      skills:
        typeof row.skills === 'string'
          ? JSON.parse(row.skills)
          : row.skills || [],

      persyaratan:
        typeof row.persyaratan === 'string'
          ? JSON.parse(row.persyaratan)
          : row.persyaratan || [],

      tanggung_jawab:
        typeof row.tanggung_jawab === 'string'
          ? JSON.parse(row.tanggung_jawab)
          : row.tanggung_jawab || [],

      benefit:
        typeof row.benefit === 'string'
          ? JSON.parse(row.benefit)
          : row.benefit || [],
    };
  }
}