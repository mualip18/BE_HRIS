import analyticsRepository from "../repositories/analytics.repository";

import {
  AnalyticsFilter,
} from "../types/analytics.types";

async function getAnalytics(
  filters: AnalyticsFilter
) {
  return analyticsRepository.getAnalytics(
    filters
  );
}

async function getReport(
  filters: AnalyticsFilter
) {
  return analyticsRepository.getReport(
    filters
  );
}

export default {
  getAnalytics,
  getReport,
};