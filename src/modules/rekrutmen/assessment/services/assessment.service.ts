// ============================================================
// assessment.service.ts
// Service Assessment Rekrutmen
// ============================================================

import {
  assessmentRepository,
} from "../repositories/assessment.repository";

import {
  CreateAssessmentComponentInput,
  UpdateAssessmentComponentInput,
  UpsertAssessmentScoreInput,
} from "../types/assessment.types";

export class AssessmentService {

  // =====================================================
  // COMPONENTS
  // =====================================================

  async getComponents() {

    return assessmentRepository
      .findAllComponents();
  }

  // =====================================================
  // COMPONENT BY ID
  // =====================================================

  async getComponentById(
    id: string
  ) {

    return assessmentRepository
      .findComponentById(id);
  }

  // =====================================================
  // CREATE COMPONENT
  // =====================================================

  async createComponent(
    data: CreateAssessmentComponentInput
  ) {

    const currentTotal =
      await assessmentRepository
        .getActiveWeightTotal();

    const newTotal =
      currentTotal +
      Number(data.weight);

    if (newTotal > 100) {

      throw new Error(
        `Total bobot komponen aktif tidak boleh lebih dari 100%. Total setelah ditambahkan: ${newTotal}%.`
      );
    }

    return assessmentRepository
      .createComponent(data);
  }

  // =====================================================
  // UPDATE COMPONENT
  // =====================================================

  async updateComponent(
    id: string,
    data: UpdateAssessmentComponentInput
  ) {

    const component =
      await assessmentRepository
        .findComponentById(id);

    if (!component) {
      return null;
    }

    if (
      data.weight !== undefined &&
      component.isActive
    ) {

      const currentTotal =
        await assessmentRepository
          .getActiveWeightTotal();

      const newTotal =
        currentTotal -
        component.weight +
        Number(data.weight);

      if (newTotal > 100) {

        throw new Error(
          `Total bobot komponen aktif tidak boleh lebih dari 100%. Total setelah perubahan: ${newTotal}%.`
        );
      }
    }

    return assessmentRepository
      .updateComponent(
        id,
        data
      );
  }

  // =====================================================
  // TOGGLE COMPONENT
  // =====================================================

  async toggleComponent(
    id: string
  ) {

    const component =
      await assessmentRepository
        .findComponentById(id);

    if (!component) {
      return null;
    }

    if (!component.isActive) {

      const currentTotal =
        await assessmentRepository
          .getActiveWeightTotal();

      const newTotal =
        currentTotal +
        component.weight;

      if (newTotal > 100) {

        throw new Error(
          `Komponen tidak dapat diaktifkan karena total bobot menjadi ${newTotal}%.`
        );
      }
    }

    return assessmentRepository
      .toggleComponent(id);
  }

  // =====================================================
  // SCORE
  // =====================================================

  async saveScore(
    data: UpsertAssessmentScoreInput
  ) {

    const component =
      await assessmentRepository
        .findComponentById(
          data.componentId
        );

    if (!component) {

      throw new Error(
        "Komponen assessment tidak ditemukan."
      );
    }

    if (!component.isActive) {

      throw new Error(
        "Komponen assessment sudah tidak aktif."
      );
    }

    return assessmentRepository
      .upsertScore(data);
  }

  // =====================================================
  // RESULTS
  // =====================================================

  async getResults() {

    return assessmentRepository
      .findResults();
  }

  // =====================================================
  // SELECTION HISTORY
  // =====================================================

  async getSelectionHistory(
    applyId: number
  ) {

    if (!applyId) {

      throw new Error(
        "Apply ID tidak ditemukan."
      );
    }

    return assessmentRepository
      .findSelectionHistory(
        Number(applyId)
      );
  }
}

export const assessmentService =
  new AssessmentService();