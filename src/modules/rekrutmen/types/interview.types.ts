export type InterviewStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled";

export type InterviewDecision =
  | "lulus"
  | "tidak_lulus";

export type AssessmentType =
  | "behavioral_admin"
  | "hr_admin"
  | "behavioral_guru"
  | "hr_guru"
  | "microteaching";

export interface InterviewEvaluationData {
  [key: string]: any;
}

export interface InterviewAssessmentResult {
  assessmentType: AssessmentType;
  totalScore: number | null;
  decision?: InterviewDecision | null;
  recommendation?: string | null;
  notes?: string | null;
  formKey?: string | null;
  title?: string | null;
  groups?: any[];
  savedAt?: string | null;
  [key: string]: any;
}

export interface CreateInterviewRequest {
  applyId: number;
  templateId?: string | null;

  tanggal: string;
  jam: string;

  duration?: number | null;

  method?: string | null;
  location?: string | null;
  meetingLink?: string | null;

  interviewerId?: string | null;
  interviewerName?: string | null;
  interviewerPosition?: string | null;

  notes?: string | null;

  status?: InterviewStatus;

  decision?: InterviewDecision | null;

  totalScore?: number | null;

  evaluationData?: InterviewEvaluationData | null;
}

export interface CreateInterviewPayload {
  applyId: number;
  templateId?: string | null;

  tanggal: string;
  jam: string;

  duration?: number | null;

  method?: string | null;
  location?: string | null;
  meetingLink?: string | null;

  interviewerId?: string | null;
  interviewerName?: string | null;
  interviewerPosition?: string | null;

  notes?: string | null;

  status?: InterviewStatus;

  decision?: InterviewDecision | null;

  totalScore?: number | null;

  evaluationData?: InterviewEvaluationData | null;
}

export interface UpdateInterviewRequest {
  applyId?: number;

  templateId?: string | null;

  tanggal?: string;
  jam?: string;

  duration?: number | null;

  method?: string | null;
  location?: string | null;
  meetingLink?: string | null;

  interviewerId?: string | null;
  interviewerName?: string | null;
  interviewerPosition?: string | null;

  notes?: string | null;

  status?: InterviewStatus;

  decision?: InterviewDecision | null;

  totalScore?: number | null;

  evaluationData?: InterviewEvaluationData | null;
}

export interface UpdateInterviewPayload {
  applyId?: number;

  templateId?: string | null;

  tanggal?: string;
  jam?: string;

  duration?: number | null;

  method?: string | null;
  location?: string | null;
  meetingLink?: string | null;

  interviewerId?: string | null;
  interviewerName?: string | null;
  interviewerPosition?: string | null;

  notes?: string | null;

  status?: InterviewStatus;

  decision?: InterviewDecision | null;

  totalScore?: number | null;

  evaluationData?: InterviewEvaluationData | null;
}

export interface SaveInterviewAssessmentRequest {
  assessmentType: AssessmentType;

  totalScore: number;

  decision?: InterviewDecision | null;

  recommendation?: string | null;

  notes?: string | null;

  evaluationData?: InterviewEvaluationData | null;
}

export interface Interview {
  id: string;

  applyId: number;

  templateId: string | null;

  tanggal: string | null;
  jam: string | null;

  duration: number | null;

  method: string | null;

  lokasi: string | null;

  meetingLink: string | null;

  interviewerId: string | null;

  interviewerName: string | null;

  interviewerPosition: string | null;

  status: InterviewStatus;

  decision: InterviewDecision | null;

  totalScore: number | null;

  notes: string | null;

  evaluationData: InterviewEvaluationData | null;

  candidateName?: string | null;

  email?: string | null;

  phone?: string | null;

  posisi?: string | null;

  createdAt: string | null;

  updatedAt: string | null;

  template?: {
    id: string;
    name: string | null;
    type: string | null;
  } | null;
}