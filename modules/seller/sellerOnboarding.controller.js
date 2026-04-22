

import Seller from "./Seller.model.js";

// ============================================================
//  @desc    Update Business Information
//  @route   PUT /api/v1/sellers/onboarding/business
//  @access  Private
// ============================================================
export const updateBusinessInfo = async (req, res, next) => {
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
                message: "No valid fields to update.",
            });
        }

        // Validation
        if (updates.businessType && !["individual", "company"].includes(updates.businessType)) {
            return res.status(400).json({
                success: false,
                message: "Business type must be 'individual' or 'company'.",
            });
        }

        const seller = await Seller.findByIdAndUpdate(
            req.seller._id,
            { $set: updates },
            { new: true, runValidators: true },
        );

        // Check if profile is now complete
        const wasComplete = seller.profileCompletedAt;
        const isNowComplete = seller.isProfileComplete;

        if (isNowComplete && !wasComplete) {
            seller.profileCompletedAt = new Date();
            await seller.save({ validateBeforeSave: false });
        }

        return res.status(200).json({
            success: true,
            message: "Business information updated successfully.",
            data: {
                businessType: seller.businessType,
                companyRegistrationNumber: seller.companyRegistrationNumber,
                vatOrBinNumber: seller.vatOrBinNumber,
                country: seller.country,
                isProfileComplete: seller.isProfileComplete,
                profileCompletedAt: seller.profileCompletedAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Update Financial Information
//  @route   PUT /api/v1/sellers/onboarding/financial
//  @access  Private
// ============================================================
export const updateFinancialInfo = async (req, res, next) => {
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
                message: "No valid fields to update.",
            });
        }

        // Validation
        if (
            updates.payoutMethod &&
            !["bank", "mobile_banking", "payoneer"].includes(updates.payoutMethod)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payout method.",
            });
        }

        if (updates.payoutSchedule && !["weekly", "monthly"].includes(updates.payoutSchedule)) {
            return res.status(400).json({
                success: false,
                message: "Payout schedule must be 'weekly' or 'monthly'.",
            });
        }

        const seller = await Seller.findByIdAndUpdate(
            req.seller._id,
            { $set: updates },
            { new: true, runValidators: true },
        );

        // Check if profile is now complete
        const wasComplete = seller.profileCompletedAt;
        const isNowComplete = seller.isProfileComplete;

        if (isNowComplete && !wasComplete) {
            seller.profileCompletedAt = new Date();
            await seller.save({ validateBeforeSave: false });
        }

        return res.status(200).json({
            success: true,
            message: "Financial information updated successfully.",
            data: {
                payoutMethod: seller.payoutMethod,
                bankAccountName: seller.bankAccountName,
                bankAccountNumber: seller.bankAccountNumber
                    ? "****" + seller.bankAccountNumber.slice(-4)
                    : null,
                bankName: seller.bankName,
                payoutSchedule: seller.payoutSchedule,
                isProfileComplete: seller.isProfileComplete,
                profileCompletedAt: seller.profileCompletedAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Update Logistics Information
//  @route   PUT /api/v1/sellers/onboarding/logistics
//  @access  Private
// ============================================================
export const updateLogisticsInfo = async (req, res, next) => {
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
                message: "No valid fields to update.",
            });
        }

        // Validation
        if (updates.shippingMethod && !["self", "platform"].includes(updates.shippingMethod)) {
            return res.status(400).json({
                success: false,
                message: "Shipping method must be 'self' or 'platform'.",
            });
        }

        const seller = await Seller.findByIdAndUpdate(
            req.seller._id,
            { $set: updates },
            { new: true, runValidators: true },
        );

        return res.status(200).json({
            success: true,
            message: "Logistics information updated successfully.",
            data: {
                shippingMethod: seller.shippingMethod,
                warehouseLocation: seller.warehouseLocation,
                returnAddress: seller.returnAddress,
                deliveryCoverageArea: seller.deliveryCoverageArea,
                isProfileComplete: seller.isProfileComplete,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Update Store Information
//  @route   PUT /api/v1/sellers/onboarding/store
//  @access  Private
// ============================================================
export const updateStoreInfo = async (req, res, next) => {
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
                message: "No valid fields to update.",
            });
        }

        const seller = await Seller.findByIdAndUpdate(
            req.seller._id,
            { $set: updates },
            { new: true, runValidators: true },
        );

        // Check if profile is now complete
        const wasComplete = seller.profileCompletedAt;
        const isNowComplete = seller.isProfileComplete;

        if (isNowComplete && !wasComplete) {
            seller.profileCompletedAt = new Date();
            await seller.save({ validateBeforeSave: false });
        }

        return res.status(200).json({
            success: true,
            message: "Store information updated successfully.",
            data: {
                shopLogo: seller.shopLogo,
                shopBanner: seller.shopBanner,
                shopDescription: seller.shopDescription,
                socialLinks: seller.socialLinks,
                isProfileComplete: seller.isProfileComplete,
                profileCompletedAt: seller.profileCompletedAt,
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============================================================
//  @desc    Get Onboarding Status
//  @route   GET /api/v1/sellers/onboarding/status
//  @access  Private
// ============================================================
export const getOnboardingStatus = async (req, res, next) => {
    try {
        const seller = await Seller.findById(req.seller._id);

        const sections = {
            business: {
                completed: !!(
                    seller.businessType &&
                    (seller.businessType === "individual" || seller.companyRegistrationNumber)
                ),
                data: {
                    businessType: seller.businessType,
                    companyRegistrationNumber: seller.companyRegistrationNumber,
                    vatOrBinNumber: seller.vatOrBinNumber,
                    country: seller.country,
                },
            },
            financial: {
                completed: !!(seller.payoutMethod && seller.bankAccountNumber),
                data: {
                    payoutMethod: seller.payoutMethod,
                    bankAccountName: seller.bankAccountName,
                    bankAccountNumber: seller.bankAccountNumber
                        ? "****" + seller.bankAccountNumber.slice(-4)
                        : null,
                    bankName: seller.bankName,
                    payoutSchedule: seller.payoutSchedule,
                },
            },
            logistics: {
                completed: !!seller.shippingMethod,
                data: {
                    shippingMethod: seller.shippingMethod,
                    warehouseLocation: seller.warehouseLocation,
                    returnAddress: seller.returnAddress,
                    deliveryCoverageArea: seller.deliveryCoverageArea,
                },
            },
            store: {
                completed: !!(seller.shopLogo || seller.shopDescription),
                data: {
                    shopLogo: seller.shopLogo,
                    shopBanner: seller.shopBanner,
                    shopDescription: seller.shopDescription,
                    socialLinks: seller.socialLinks,
                },
            },
        };

        return res.status(200).json({
            success: true,
            data: {
                isProfileComplete: seller.isProfileComplete,
                profileCompletedAt: seller.profileCompletedAt,
                sections,
                missingRequirements: {
                    business: !sections.business.completed,
                    financial: !sections.financial.completed,
                    logistics: !sections.logistics.completed,
                    store: !sections.store.completed,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};
