/** @format */

import * as technicianService from "../services/technician.service.js";

/**
 * Get technician dashboard statistics
 */
export const getDashboard = async (req, res, next) => {
  try {
    const technicianId = req.user.id;

    // Verify user is a technician
    if (
      req.user.role !== "TECH_INTERNAL" &&
      req.user.role !== "TECH_FREELANCER"
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. Technicians only." });
    }

    const dashboard = await technicianService.getTechnicianDashboard(
      technicianId
    );
    return res.json(dashboard);
  } catch (err) {
    next(err);
  }
};

/**
 * Get technician's jobs by status (incoming, active, done)
 */
export const getJobs = async (req, res, next) => {
  try {
    const technicianId = req.user.id;
    const { status } = req.query;

    // Verify user is a technician
    if (
      req.user.role !== "TECH_INTERNAL" &&
      req.user.role !== "TECH_FREELANCER"
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. Technicians only." });
    }

    // Validate status parameter
    const validStatuses = ["available", "incoming", "active", "done"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const jobs = await technicianService.getTechnicianJobs(
      technicianId,
      status
    );

    return res.json({
      jobs,
      count: jobs.length,
      status: status || "all",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get technician's work orders
 */
export const getWorkOrders = async (req, res, next) => {
  try {
    const technicianId = req.user.id;
    const { status } = req.query;

    // Verify user is a technician
    if (
      req.user.role !== "TECH_INTERNAL" &&
      req.user.role !== "TECH_FREELANCER"
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. Technicians only." });
    }

    const workOrders = await technicianService.getActiveWorkOrders(
      technicianId,
      status
    );
    return res.json(workOrders);
  } catch (err) {
    next(err);
  }
};

/**
 * Get technician's wallet and transactions
 */
export const getWallet = async (req, res, next) => {
  try {
    const technicianId = req.user.id;

    // Verify user is a freelancer technician (internal techs don't have wallets)
    if (req.user.role !== "TECH_FREELANCER") {
      return res.status(403).json({
        message: "Access denied. Wallet is only available for freelancers.",
      });
    }

    const wallet = await technicianService.getTechnicianWallet(technicianId);
    return res.json(wallet);
  } catch (err) {
    if (err.message === "Wallet not found for this technician") {
      return res.status(404).json({ message: err.message });
    }
    next(err);
  }
};

/**
 * Get technician's earnings summary
 */
export const getEarnings = async (req, res, next) => {
  try {
    const technicianId = req.user.id;

    // Verify user is a technician
    if (
      req.user.role !== "TECH_INTERNAL" &&
      req.user.role !== "TECH_FREELANCER"
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. Technicians only." });
    }

    const earnings = await technicianService.getTechnicianEarnings(
      technicianId
    );
    return res.json(earnings);
  } catch (err) {
    if (err.message === "Technician profile not found") {
      return res.status(404).json({ message: err.message });
    }
    next(err);
  }
};

/**
 * Get technician work history
 */
export const getWorkHistory = async (req, res, next) => {
  try {
    const technicianId = req.user.id;

    // Verify user is a technician
    if (
      req.user.role !== "TECH_INTERNAL" &&
      req.user.role !== "TECH_FREELANCER"
    ) {
      return res
        .status(403)
        .json({ message: "Access denied. Technicians only." });
    }

    const workHistory = await technicianService.getWorkHistory(technicianId);
    return res.json(workHistory);
  } catch (err) {
    next(err);
  }
};
