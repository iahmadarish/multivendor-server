/**
 * ============================================================
 *  adminSeller.routes.js
 *
 *  Mount করুন এভাবে (আপনার main app.js বা routes/index.js তে):
 *  import adminSellerRoutes from "./routes/adminSeller.routes.js";
 *  app.use("/api/v1/admin/sellers", adminSellerRoutes);
 *
 *  সব route এ protect + adminOnly middleware লাগানো আছে।
 *  এই middleware গুলো আপনার existing auth.middleware.js থেকে আসছে।
 * ============================================================
 */

import express from "express";
import {
    getAllSellers,
    getSellerSummary,
    getSellerById,
    updateSellerStatus,
    getAllPendingUpdates,
    approvePendingUpdate,
    rejectPendingUpdate,
} from "./adminSeller.controller.js";

// আপনার existing user auth middleware
import { protect, adminOnly } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// সব routes এ protect + adminOnly apply করা
router.use(protect, adminOnly);

// ─── Seller List & Summary ────────────────────────────────────
// GET  /api/v1/admin/sellers              → সব sellers (filter, pagination)
// GET  /api/v1/admin/sellers/summary      → status count summary (dashboard)
router.get("/summary", getSellerSummary);
router.get("/", getAllSellers);

// ─── Pending Updates (সব sellers এর একসাথে) ──────────────────
// GET  /api/v1/admin/sellers/pending-updates           → সব pending update requests
// GET  /api/v1/admin/sellers/pending-updates?section=identity  → section filter
router.get("/pending-updates", getAllPendingUpdates);

// ─── Single Seller ────────────────────────────────────────────
// GET   /api/v1/admin/sellers/:sellerId                → seller details + pending updates
// PATCH /api/v1/admin/sellers/:sellerId/status         → account approve/reject/suspend
router.get("/:sellerId", getSellerById);
router.patch("/:sellerId/status", updateSellerStatus);

// ─── Pending Update Actions ───────────────────────────────────
// PATCH /api/v1/admin/sellers/:sellerId/pending-updates/:updateId/approve
// PATCH /api/v1/admin/sellers/:sellerId/pending-updates/:updateId/reject
router.patch("/:sellerId/pending-updates/:updateId/approve", approvePendingUpdate);
router.patch("/:sellerId/pending-updates/:updateId/reject", rejectPendingUpdate);

export default router;
