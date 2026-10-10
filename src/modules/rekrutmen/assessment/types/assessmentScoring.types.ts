export interface AssessmentScoringConfig {

  id: string;

  testId: string;

  componentId: string;

  componentName: string;

  componentCode: string;

  weight: number;

  createdAt: string | Date;

  updatedAt: string | Date;
}


export interface UpdateAssessmentScoringInput {

  componentId: string;

  weight: number;
}


export interface AssessmentScoringSummary {

  testId: string;

  totalWeight: number;

  isValid: boolean;

  components:
    AssessmentScoringConfig[];
}