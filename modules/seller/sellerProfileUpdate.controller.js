// modules/seller/sellerProfileUpdate.controller.js
import prisma from "../../config/database.js";

const hasPendingForSection = async (sellerId, section) => {
    const pending = await prisma.pendingUpdate.findFirst({
        where: {
            sellerId,
            section,
            status: "pending",
        },
    });
    return !!pending;
};

// ============================================================
//  @desc    Request Profile Info Update (fullName, shopName)
//  @route   PUT /api/v1/sellers/auth/profile/update/profile
//  @access  Private
// ============================================================
export const requestProfileUpdate = async (req, res, next) => {
    try {
        const allowedFields = ["fullName", "shopName"];

        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update.",
            });
        }

        const sellerId = parseInt(req.seller.id);
        
        if (await hasPendingForSection(sellerId, "profile")) {
            return res.status(409).json({
                success: false,
                message: "You already have a pending profile update request. Please wait for admin review before submitting another.",
            });
        }

        await prisma.pendingUpdate.create({
            data: {
                sellerId,
                section: "profile",
                data: updates,
            },
        });

        return res.status(202).json({
            success: true,
            message: "Profile update request submitted successfully. It will be applied after admin approval.",
            data: {
                section: "profile",
                requestedChanges: updates,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Request Business Info Update
//  @route   PUT /api/v1/sellers/auth/profile/update/business
//  @access  Private
// ============================================================
export const requestBusinessUpdate = async (req, res, next) => {
    try {
        const allowedFields = [
            "businessType",
            "companyRegistrationNumber",
            "vatOrBinNumber",
            "country",
        ];
        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update.",
            });
        }

        const sellerId = parseInt(req.seller.id);

        if (await hasPendingForSection(sellerId, "business")) {
            return res.status(409).json({
                success: false,
                message: "You already have a pending business info update request. Please wait for admin review.",
            });
        }

        await prisma.pendingUpdate.create({
            data: {
                sellerId,
                section: "business",
                data: updates,
            },
        });

        return res.status(202).json({
            success: true,
            message: "Business info update request submitted. It will be applied after admin approval.",
            data: {
                section: "business",
                requestedChanges: updates,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Request Financial Info Update
//  @route   PUT /api/v1/sellers/auth/profile/update/financial
//  @access  Private
// ============================================================
export const requestFinancialUpdate = async (req, res, next) => {
    try {
        const allowedFields = [
            "payoutMethod",
            "bankAccountName",
            "bankAccountNumber",
            "bankName",
            "chequeImage",
            "payoutSchedule",
        ];

        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update.",
            });
        }

        const sellerId = parseInt(req.seller.id);

        if (await hasPendingForSection(sellerId, "financial")) {
            return res.status(409).json({
                success: false,
                message: "You already have a pending financial info update request. Please wait for admin review.",
            });
        }

        await prisma.pendingUpdate.create({
            data: {
                sellerId,
                section: "financial",
                data: updates,
            },
        });

        return res.status(202).json({
            success: true,
            message: "Financial info update request submitted. It will be applied after admin approval.",
            data: {
                section: "financial",
                requestedChanges: {
                    ...updates,
                    bankAccountNumber: updates.bankAccountNumber
                        ? "****" + updates.bankAccountNumber.slice(-4)
                        : undefined,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Request Logistics Info Update
//  @route   PUT /api/v1/sellers/auth/profile/update/logistics
//  @access  Private
// ============================================================
export const requestLogisticsUpdate = async (req, res, next) => {
    try {
        const allowedFields = [
            "shippingMethod",
            "warehouseLocation",
            "returnAddress",
            "deliveryCoverageArea",
        ];

        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update.",
            });
        }

        const sellerId = parseInt(req.seller.id);

        if (await hasPendingForSection(sellerId, "logistics")) {
            return res.status(409).json({
                success: false,
                message: "You already have a pending logistics info update request. Please wait for admin review.",
            });
        }

        await prisma.pendingUpdate.create({
            data: {
                sellerId,
                section: "logistics",
                data: updates,
            },
        });

        return res.status(202).json({
            success: true,
            message: "Logistics info update request submitted. It will be applied after admin approval.",
            data: {
                section: "logistics",
                requestedChanges: updates,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Request Store Info Update
//  @route   PUT /api/v1/sellers/auth/profile/update/store
//  @access  Private
// ============================================================
export const requestStoreUpdate = async (req, res, next) => {
    try {
        const allowedFields = ["shopLogo", "shopBanner", "shopDescription", "socialLinks"];

        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update.",
            });
        }

        const sellerId = parseInt(req.seller.id);

        if (await hasPendingForSection(sellerId, "store")) {
            return res.status(409).json({
                success: false,
                message: "You already have a pending store info update request. Please wait for admin review.",
            });
        }

        await prisma.pendingUpdate.create({
            data: {
                sellerId,
                section: "store",
                data: updates,
            },
        });

        return res.status(202).json({
            success: true,
            message: "Store info update request submitted. It will be applied after admin approval.",
            data: {
                section: "store",
                requestedChanges: updates,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Request Identity Info Update (NID / Passport)
//  @route   PUT /api/v1/sellers/auth/profile/update/identity
//  @access  Private
// ============================================================
export const requestIdentityUpdate = async (req, res, next) => {
    try {
        const allowedFields = [
            "identityType",
            "identityNumber",
            "identityFrontImage",
            "identityBackImage",
        ];

        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields provided for update.",
            });
        }

        if (updates.identityType && (!updates.identityNumber || !updates.identityFrontImage)) {
            return res.status(400).json({
                success: false,
                message: "When submitting identity type, identityNumber and identityFrontImage are also required.",
            });
        }

        const sellerId = parseInt(req.seller.id);

        if (await hasPendingForSection(sellerId, "identity")) {
            return res.status(409).json({
                success: false,
                message: "You already have a pending identity update request. Please wait for admin review.",
            });
        }

        // Reset identity verification status
        await prisma.seller.update({
            where: { id: sellerId },
            data: { isIdentityVerified: false },
        });

        await prisma.pendingUpdate.create({
            data: {
                sellerId,
                section: "identity",
                data: updates,
            },
        });

        return res.status(202).json({
            success: true,
            message: "Identity update request submitted. It will be reviewed and applied after admin approval.",
            data: {
                section: "identity",
                requestedChanges: {
                    identityType: updates.identityType,
                    identityNumber: updates.identityNumber
                        ? "****" + updates.identityNumber.slice(-4)
                        : undefined,
                    identityFrontImage: updates.identityFrontImage ? "Uploaded" : undefined,
                    identityBackImage: updates.identityBackImage ? "Uploaded" : undefined,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Get My Pending Updates
//  @route   GET /api/v1/sellers/auth/profile/pending-updates
//  @access  Private
// ============================================================
export const getMyPendingUpdates = async (req, res, next) => {
    try {
        const sellerId = parseInt(req.seller.id);
        
        const allUpdates = await prisma.pendingUpdate.findMany({
            where: { sellerId },
            orderBy: { requestedAt: "desc" },
        });

        const grouped = {
            pending: [],
            approved: [],
            rejected: [],
        };

        allUpdates.forEach((update) => {
            const entry = {
                id: update.id,
                section: update.section,
                requestedAt: update.requestedAt,
                reviewedAt: update.reviewedAt,
                rejectionReason: update.rejectionReason,
                data: update.section === "identity"
                    ? {
                          ...update.data,
                          identityNumber: update.data.identityNumber
                              ? "****" + update.data.identityNumber.slice(-4)
                              : undefined,
                      }
                    : update.section === "financial"
                    ? {
                          ...update.data,
                          bankAccountNumber: update.data.bankAccountNumber
                              ? "****" + update.data.bankAccountNumber.slice(-4)
                              : undefined,
                      }
                    : update.data,
            };
            grouped[update.status].push(entry);
        });

        return res.status(200).json({
            success: true,
            data: {
                totalPending: grouped.pending.length,
                updates: grouped,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Cancel a Pending Update Request
//  @route   DELETE /api/v1/sellers/auth/profile/pending-updates/:updateId
//  @access  Private
// ============================================================
export const cancelPendingUpdate = async (req, res, next) => {
    try {
        const { updateId } = req.params;

        const update = await prisma.pendingUpdate.findUnique({
            where: { id: updateId },
        });

        if (!update) {
            return res.status(404).json({
                success: false,
                message: "Pending update request not found.",
            });
        }

        if (update.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel a request that has already been '${update.status}'.`,
            });
        }

        // Only the owner can cancel
        if (update.sellerId !== parseInt(req.seller.id)) {
            return res.status(403).json({
                success: false,
                message: "You can only cancel your own update requests.",
            });
        }

        await prisma.pendingUpdate.delete({
            where: { id: updateId },
        });

        return res.status(200).json({
            success: true,
            message: "Pending update request cancelled successfully.",
        });
    } catch (error) {
        next(error);
    }
};