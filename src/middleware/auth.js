/** @format */

// src/middleware/auth.js
import { verifyToken } from "../utils/jwt.js";

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Unauthorized - No token provided" });
  }
  const token = header.split(" ")[1];
  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, role, phone }
    next();
  } catch (error) {
    // Provide specific error messages for different token issues
    let message = "Invalid token";
    if (error.name === "TokenExpiredError") {
      message = "Token expired - Please login again";
    } else if (error.name === "JsonWebTokenError") {
      message = `Invalid token - ${error.message}`;
    } else if (error.name === "NotBeforeError") {
      message = "Token not yet active";
    }
    console.error(`🔐 Auth Error: ${message}`, {
      error: error.message,
      tokenPreview: token?.substring(0, 20) + "...",
    });
    return res.status(401).json({ message });
  }
};

// Optional authentication - sets req.user if token is valid, but doesn't reject if missing
export const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.split(" ")[1];
    try {
      const decoded = verifyToken(token);
      req.user = decoded; // { id, role, phone }
    } catch {
      // Token is invalid, but we don't reject the request
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
};

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

// Aliases for consistency
export const authenticate = authMiddleware;
export const authorize = (roles) => requireRole(...roles);
