import {
  CreateAssessmentComponentInput,
  UpdateAssessmentComponentInput,
  UpsertAssessmentScoreInput,
} from "../types/assessment.types";

export function validateCreateComponent(
  payload: CreateAssessmentComponentInput
): string | null {
  if (!payload.name || payload.name.trim().length < 2) {
    return "Nama komponen wajib diisi.";
  }

  if (!payload.code || payload.code.trim().length < 2) {
    return "Kode komponen wajib diisi.";
  }

  if (
    payload.weight === undefined ||
    payload.weight === null ||
    Number.isNaN(Number(payload.weight))
  ) {
    return "Bobot wajib diisi.";
  }

  const weight = Number(payload.weight);

  if (weight < 0 || weight > 100) {
    return "Bobot harus berada di antara 0 sampai 100.";
  }

  return null;
}

export function validateUpdateComponent(
  payload: UpdateAssessmentComponentInput
): string | null {
  if (
    payload.name !== undefined &&
    payload.name.trim().length < 2
  ) {
    return "Nama komponen minimal 2 karakter.";
  }

  if (
    payload.code !== undefined &&
    payload.code.trim().length < 2
  ) {
    return "Kode komponen minimal 2 karakter.";
  }

  if (payload.weight !== undefined) {
    const weight = Number(payload.weight);

    if (Number.isNaN(weight) || weight < 0 || weight > 100) {
      return "Bobot harus berada di antara 0 sampai 100.";
    }
  }

  return null;
}

export function validateAssessmentScore(
  payload: UpsertAssessmentScoreInput
): string | null {
  if (!payload.applyId) {
    return "applyId wajib diisi.";
  }

  if (!payload.componentId) {
    return "componentId wajib diisi.";
  }

  if (
    payload.score !== null &&
    payload.score !== undefined
  ) {
    const score = Number(payload.score);

    if (Number.isNaN(score)) {
      return "Nilai harus berupa angka.";
    }

    if (score < 0 || score > 100) {
      return "Nilai harus berada di antara 0 sampai 100.";
    }
  }

  return null;
}