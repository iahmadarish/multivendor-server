/**
 * ============================================================
 *  adminSeller.controller.js
 *
 *  Admin থেকে seller management এর সব operations:
 *  - Seller list দেখা (filter, pagination)
 *  - একজন seller এর full details দেখা
 *  - Seller account status change (approve/reject/suspend)
 *  - Seller এর pending updates দেখা
 *  - Pending update approve করা (main fields এ apply হবে)
 *  - Pending update reject করা (reason সহ)
 *
 *  Route prefix: /api/v1/admin/sellers
 *  Middleware:   protect + adminOnly (user auth middleware থেকে)
 * ============================================================
 */

import Seller from "../../modules/seller/Seller.model.js";

// ============================================================
//  @desc    Get all sellers (with filter & pagination)
//  @route   GET /api/v1/admin/sellers
//  @access  Admin
// ============================================================
export const getAllSellers = async (req, res, next) => {
    try {
        const {
            status,        // "pending" | "approved" | "rejected" | "suspended"
            search,        // shopName বা email দিয়ে search
            page = 1,
            limit = 20,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = req.query;

        const filter = {};

        if (status) filter.status = status;

        if (search) {
            filter.$or = [
                { shopName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { fullName: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

        const [sellers, total] = await Promise.all([
            Seller.find(filter)
                .select("fullName shopName email phone status isEmailVerified isPhoneVerified isIdentityVerified businessType country createdAt rating totalOrders")
                .sort(sort)
                .skip(skip)
                .limit(Number(limit)),
            Seller.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                sellers,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                },
                // Quick summary counts — dashboard এ কাজে লাগবে
                counts: {
                    total,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Get seller status summary counts (for dashboard)
//  @route   GET /api/v1/admin/sellers/summary
//  @access  Admin
// ============================================================
export const getSellerSummary = async (req, res, next) => {
    try {
        const [pending, approved, rejected, suspended, pendingUpdates] = await Promise.all([
            Seller.countDocuments({ status: "pending" }),
            Seller.countDocuments({ status: "approved" }),
            Seller.countDocuments({ status: "rejected" }),
            Seller.countDocuments({ status: "suspended" }),
            // pendingUpdates array তে অন্তত একটা "pending" entry আছে এমন sellers
            Seller.countDocuments({ "pendingUpdates.status": "pending" }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                accountStatus: { pending, approved, rejected, suspended },
                pendingUpdateRequests: pendingUpdates,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Get single seller full details
//  @route   GET /api/v1/admin/sellers/:sellerId
//  @access  Admin
// ============================================================
export const getSellerById = async (req, res, next) => {
    try {
        const seller = await Seller.findById(req.params.sellerId).select("+pendingUpdates");

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Seller not found.",
            });
        }

        // Safe object — sensitive fields বাদ দিয়ে
        const sellerData = seller.toSafeObject();

        // pending updates আলাদা করে group করে দেখানো
        const pendingUpdates = (seller.pendingUpdates || []).map((u) => ({
            id: u._id,
            section: u.section,
            status: u.status,
            requestedAt: u.requestedAt,
            reviewedAt: u.reviewedAt,
            reviewedBy: u.reviewedBy,
            rejectionReason: u.rejectionReason,
            data: maskSensitiveData(u.section, u.data),
        }));

        return res.status(200).json({
            success: true,
            data: {
                seller: sellerData,
                pendingUpdates: {
                    pending: pendingUpdates.filter((u) => u.status === "pending"),
                    approved: pendingUpdates.filter((u) => u.status === "approved"),
                    rejected: pendingUpdates.filter((u) => u.status === "rejected"),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Update seller account status (approve/reject/suspend)
//  @route   PATCH /api/v1/admin/sellers/:sellerId/status
//  @access  Admin
//
//  Body: { status: "approved" | "rejected" | "suspended" | "pending", reason: "..." }
// ============================================================
export const updateSellerStatus = async (req, res, next) => {
    try {
        const { status, reason } = req.body;

        const validStatuses = ["pending", "approved", "rejected", "suspended"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${validStatuses.join(", ")}`,
            });
        }

        const seller = await Seller.findById(req.params.sellerId);
        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Seller not found.",
            });
        }

        const previousStatus = seller.status;
        seller.status = status;

        // approved হলে agreement date set করা
        if (status === "approved" && previousStatus !== "approved") {
            seller.sellerAgreementAcceptedAt = new Date();
        }

        await seller.save({ validateBeforeSave: false });

        return res.status(200).json({
            success: true,
            message: `Seller account status updated to '${status}' successfully.`,
            data: {
                sellerId: seller._id,
                shopName: seller.shopName,
                email: seller.email,
                previousStatus,
                currentStatus: seller.status,
                reason: reason || null,
                updatedBy: req.user._id,
                updatedAt: new Date(),
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Get all pending update requests across all sellers
//  @route   GET /api/v1/admin/sellers/pending-updates
//  @access  Admin
//  Dashboard এ সব sellers এর pending update একসাথে দেখার জন্য।
// ============================================================
export const getAllPendingUpdates = async (req, res, next) => {
    try {
        const { section, page = 1, limit = 20 } = req.query;

        // pendingUpdates এ অন্তত একটা "pending" entry আছে এমন sellers
        const matchFilter = { "pendingUpdates.status": "pending" };

        const sellers = await Seller.find(matchFilter)
            .select("fullName shopName email status pendingUpdates")
            .select("+pendingUpdates");

        // Flatten করে সব pending entries বের করা
        let allPending = [];
        sellers.forEach((seller) => {
            (seller.pendingUpdates || []).forEach((update) => {
                if (update.status === "pending") {
                    if (section && update.section !== section) return; // section filter
                    allPending.push({
                        updateId: update._id,
                        sellerId: seller._id,
                        shopName: seller.shopName,
                        email: seller.email,
                        sellerStatus: seller.status,
                        section: update.section,
                        requestedAt: update.requestedAt,
                        data: maskSensitiveData(update.section, update.data),
                    });
                }
            });
        });

        // Sort by requestedAt ascending (oldest first)
        allPending.sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt));

        // Pagination
        const total = allPending.length;
        const start = (Number(page) - 1) * Number(limit);
        const paginated = allPending.slice(start, start + Number(limit));

        return res.status(200).json({
            success: true,
            data: {
                pendingUpdates: paginated,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / Number(limit)),
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Approve a specific pending update
//  @route   PATCH /api/v1/admin/sellers/:sellerId/pending-updates/:updateId/approve
//  @access  Admin
// ============================================================
export const approvePendingUpdate = async (req, res, next) => {
    try {
        const { sellerId, updateId } = req.params;

        const seller = await Seller.findById(sellerId).select("+pendingUpdates");

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Seller not found.",
            });
        }

        // Model এর instance method ব্যবহার করে approve করা
        // এটা pending entry কে "approved" করে এবং data টা main fields এ apply করে
        const appliedData = await seller.applyPendingUpdate(updateId, req.user._id);

        // identity section approve হলে isIdentityVerified = true করা
        const update = seller.pendingUpdates.id(updateId);
        if (update?.section === "identity") {
            seller.isIdentityVerified = true;
            await seller.save({ validateBeforeSave: false });
        }

        return res.status(200).json({
            success: true,
            message: "Pending update approved and applied successfully.",
            data: {
                sellerId: seller._id,
                shopName: seller.shopName,
                updateId,
                section: update?.section,
                appliedFields: Object.keys(appliedData),
                approvedBy: req.user._id,
                approvedAt: new Date(),
            },
        });
    } catch (error) {
        // applyPendingUpdate থেকে throw করা errors handle করা
        if (error.message === "Pending update not found" || error.message === "This update has already been reviewed") {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// ============================================================
//  @desc    Reject a specific pending update
//  @route   PATCH /api/v1/admin/sellers/:sellerId/pending-updates/:updateId/reject
//  @access  Admin
//  Body: { reason: "Please provide a valid document" }
// ============================================================
export const rejectPendingUpdate = async (req, res, next) => {
    try {
        const { sellerId, updateId } = req.params;
        const { reason } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "A rejection reason is required.",
            });
        }

        const seller = await Seller.findById(sellerId).select("+pendingUpdates");

        if (!seller) {
            return res.status(404).json({
                success: false,
                message: "Seller not found.",
            });
        }

        const update = seller.pendingUpdates.id(updateId);
        const section = update?.section;

        // Model এর instance method ব্যবহার করে reject করা
        await seller.rejectPendingUpdate(updateId, req.user._id, reason);

        return res.status(200).json({
            success: true,
            message: "Pending update rejected successfully.",
            data: {
                sellerId: seller._id,
                shopName: seller.shopName,
                updateId,
                section,
                rejectionReason: reason,
                rejectedBy: req.user._id,
                rejectedAt: new Date(),
            },
        });
    } catch (error) {
        if (error.message === "Pending update not found" || error.message === "This update has already been reviewed") {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
};

// ============================================================
//  Helper: sensitive data mask করা (admin view এ দেখানোর জন্য)
// ============================================================
const maskSensitiveData = (section, data) => {
    if (!data) return data;
    const masked = { ...data };
    if (section === "financial" && masked.bankAccountNumber) {
        masked.bankAccountNumber = "****" + masked.bankAccountNumber.slice(-4);
    }
    if (section === "identity" && masked.identityNumber) {
        masked.identityNumber = "****" + masked.identityNumber.slice(-4);
    }
    return masked;
};
