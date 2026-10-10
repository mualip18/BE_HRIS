import {
  assessmentScoringRepository,
} from "../repositories/assessmentScoring.repository";

import {
  UpdateAssessmentScoringInput,
} from "../types/assessmentScoring.types";

import {
  validateScoringConfig,
} from "../validations/assessmentScoring.validation";

export class AssessmentScoringService {

  // =========================================================
  // GET CONFIG
  // =========================================================

  async getConfig(
    testId: string
  ) {

    if (!testId) {
      throw new Error(
        "Test ID wajib diisi."
      );
    }

    const exists =
      await assessmentScoringRepository.testExists(
        testId
      );

    if (!exists) {
      throw new Error(
        "Assessment/Test tidak ditemukan."
      );
    }

    const saved =
      await assessmentScoringRepository.findByTestId(
        testId
      );

    const components =
      await assessmentScoringRepository.findActiveComponents();

    /*
     * Jika konfigurasi belum pernah dibuat,
     * gunakan default weight dari assessment_components.
     */

    if (!saved.length) {

      const totalWeight =
        components.reduce(
          (total, component) =>
            total +
            Number(component.defaultWeight),
          0
        );

      return {
        testId,

        totalWeight,

        // ✅ Validasi dilonggarkan:
        // cukup ada komponen aktif, tidak harus = 100
        isValid: components.length > 0,

        components:
          components.map((component) => ({
            id: "",

            testId,

            componentId:
              component.id,

            componentName:
              component.name,

            componentCode:
              component.code,

            weight:
              Number(
                component.defaultWeight
              ),

            createdAt: "",
            updatedAt: "",
          })),
      };
    }

    const totalWeight =
      saved.reduce(
        (total, item) =>
          total +
          Number(item.weight),
        0
      );

    return {
      testId,

      totalWeight,

      // ✅ Validasi dilonggarkan
      isValid:
        saved.length > 0,

      components: saved,
    };
  }


  // =========================================================
  // SAVE CONFIG
  // =========================================================

  async saveConfig(
    testId: string,
    configs: UpdateAssessmentScoringInput[]
  ) {

    if (!testId) {
      throw new Error(
        "Test ID wajib diisi."
      );
    }

    const validation =
      validateScoringConfig(
        configs
      );

    if (validation) {
      throw new Error(
        validation
      );
    }

    const testExists =
      await assessmentScoringRepository.testExists(
        testId
      );

    if (!testExists) {
      throw new Error(
        "Assessment/Test tidak ditemukan."
      );
    }

    const componentIds =
      configs.map(
        (item) =>
          item.componentId
      );

    const componentsExist =
      await assessmentScoringRepository.componentsExist(
        componentIds
      );

    if (!componentsExist) {
      throw new Error(
        "Terdapat komponen assessment yang tidak ditemukan."
      );
    }

    const data =
      await assessmentScoringRepository.replaceForTest(
        testId,
        configs
      );

    const totalWeight =
      data.reduce(
        (total, item) =>
          total +
          Number(item.weight),
        0
      );

    return {
      testId,

      totalWeight,

      // ✅ Validasi dilonggarkan
      isValid:
        data.length > 0,

      components: data,
    };
  }
}

export const assessmentScoringService =
  new AssessmentScoringService();