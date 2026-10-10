import {
  UpdateAssessmentScoringInput,
} from "../types/assessmentScoring.types";

export function validateScoringConfig(
  data: UpdateAssessmentScoringInput[]
): string | null {

  if (!Array.isArray(data)) {
    return "Konfigurasi scoring harus berupa array.";
  }

  if (data.length === 0) {
    return "Minimal satu komponen scoring harus dikonfigurasi.";
  }

  const componentIds =
    new Set<string>();

  let total = 0;

  for (const item of data) {

    if (!item.componentId) {
      return "Component ID wajib diisi.";
    }

    if (
      componentIds.has(
        item.componentId
      )
    ) {
      return `Komponen ${item.componentId} tidak boleh duplikat.`;
    }

    componentIds.add(
      item.componentId
    );

    const weight =
      Number(item.weight);

    if (!Number.isFinite(weight)) {
      return "Bobot harus berupa angka.";
    }

    if (
      weight < 0 ||
      weight > 100
    ) {
      return "Bobot harus berada di antara 0 sampai 100%.";
    }

    total += weight;
  }

  if (
    Math.abs(total - 100) >
    0.001
  ) {
    return `Total bobot harus 100%. Total saat ini ${total}%.`;
  }

  return null;
}