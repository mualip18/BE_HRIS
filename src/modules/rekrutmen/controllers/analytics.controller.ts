
import type { Request, Response } from "express";

import analyticsService from "../services/analytics.service";

const getAnalytics = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await analyticsService.getAnalytics(
      req.query
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "[AnalyticsController] getAnalytics:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data analitik rekrutmen",
    });
  }
};

const getReport = async (
  req: Request,
  res: Response
) => {
  try {
    const data = await analyticsService.getReport(
      req.query
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "[AnalyticsController] getReport:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil laporan rekrutmen",
    });
  }
};

export default {
  getAnalytics,
  getReport,
};
