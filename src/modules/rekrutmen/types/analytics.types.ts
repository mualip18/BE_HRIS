export interface AnalyticsFilter {
  startDate?: string;
  endDate?: string;
  jobId?: number;
  posisi?: string;
}

export interface RecruitmentSummary {
  totalPelamar: number;
  lolosAssessment: number;
  masukInterview: number;
  interviewTerjadwal: number;
  interviewLulus: number;
  diterima: number;
  gagal: number;
}

export interface RecruitmentFunnel {
  label: string;
  value: number;
}

export interface RecruitmentTrend {
  periode: string;
  total: number;
}

export interface RecruitmentPosition {
  posisi: string;
  total: number;
  assessmentLulus: number;
  interviewLulus: number;
  diterima: number;
}

export interface RecruitmentStatus {
  status: string;
  total: number;
}

export interface RecruitmentReportRow {
  applyId: number;
  nama: string | null;
  email: string | null;
  posisi: string | null;
  lowongan: string | null;
  tanggalLamar: string | null;

  assessmentScore: number | null;
  assessmentPassed: boolean | null;

  interviewStatus: string | null;
  interviewDecision: string | null;
  interviewScore: number | null;

  employeeStatus: string | null;
}

export interface RecruitmentAnalytics {
  summary: RecruitmentSummary;
  funnel: RecruitmentFunnel[];
  trends: RecruitmentTrend[];
  positions: RecruitmentPosition[];
  statuses: RecruitmentStatus[];
}