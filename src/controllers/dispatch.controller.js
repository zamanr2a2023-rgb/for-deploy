/** @format */

// src/controllers/dispatch.controller.js
import * as dispatchService from "../services/dispatch.service.js";

export const getDispatchOverview = async (req, res, next) => {
  try {
    const overview = await dispatchService.getDispatchOverview();
    return res.json(overview);
  } catch (err) {
    next(err);
  }
};

export const getTechnicianStatus = async (req, res, next) => {
  try {
    const status = await dispatchService.getTechnicianStatus();
    return res.json(status);
  } catch (err) {
    next(err);
  }
};

export const getRecentWorkOrders = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const workOrders = await dispatchService.getRecentWorkOrders(Number(limit));
    return res.json(workOrders);
  } catch (err) {
    next(err);
  }
};

export const getTechnicianLocations = async (req, res, next) => {
  try {
    const locations = await dispatchService.getTechnicianLocations();
    return res.json(locations);
  } catch (err) {
    next(err);
  }
};
