import Cart from '../cart/cart.model.js';
import Coupon from '../coupon/Coupon.js';
import { District, CourierBranch, ShippingRate } from '../../models/ShippingConfig.model.js';


const applyCouponLogic = async (couponCode, itemsSubtotal, itemsToProcess, userId) => {
    let discountAmount = 0;
    let isFreeShipping = false;

    if (!couponCode) {
        return { discountAmount, isFreeShipping, validationMessage: 'No coupon code provided' };
    }

    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });

    if (!coupon) {
        return { discountAmount, isFreeShipping, validationMessage: 'Invalid coupon code' };
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.expiryDate) {
        return { discountAmount, isFreeShipping, validationMessage: 'Coupon is expired or not yet active' };
    }

    if (coupon.usedCount >= coupon.maxUsage) {
        return { discountAmount, isFreeShipping, validationMessage: 'Coupon usage limit reached' };
    }

    if (itemsSubtotal < coupon.minOrderAmount) {
        return { discountAmount, isFreeShipping, validationMessage: `Minimum order amount of ${coupon.minOrderAmount} is required` };
    }

    if (coupon.couponType === 'percentage') {
        discountAmount = itemsSubtotal * (coupon.value / 100);
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
        }
    } else if (coupon.couponType === 'fixed') {
        discountAmount = coupon.value;
    } else if (coupon.couponType === 'free_shipping') {
        isFreeShipping = true;
        discountAmount = 0;
    }

    if (discountAmount > itemsSubtotal) {
        discountAmount = itemsSubtotal;
    }

    return {
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        isFreeShipping,
        validationMessage: 'Coupon applied successfully'
    };
};

// ─── Zone Helpers ─────────────────────────────────────────────────────────────

/**
 * shippingZone (DB value) → locationType (API value)
 *   dhaka_city    → dhaka_inside
 *   dhaka_sub     → dhaka_sub
 *   dhaka_outside → outside_dhaka
 *   other_district→ outside_dhaka
 */
const shippingZoneToLocationType = (shippingZone) => {
    switch (shippingZone) {
        case 'dhaka_city':     return 'dhaka_inside';
        case 'dhaka_sub':      return 'dhaka_sub';
        case 'dhaka_outside':  return 'outside_dhaka';
        case 'other_district': return 'outside_dhaka';
        default:               return 'outside_dhaka';
    }
};

/**
 * locationType গুলো যেগুলোতে শুধু Home Delivery পাওয়া যাবে
 */
const isHomeDeliveryOnly = (locationType) =>
    locationType === 'dhaka_inside' || locationType === 'dhaka_sub';


// @desc    Get all active districts
// @route   GET /api/v1/checkout/districts
// @access  Public
export const getDistricts = async (req, res) => {
    try {
        const districts = await District.find({ isActive: true }).sort({ name: 1 });
        res.status(200).json({
            success: true,
            districts: districts.map(d => d.name)
        });
    } catch (error) {
        console.error('Get districts error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch districts' });
    }
};


// @desc    Get upazilas by district
// @route   GET /api/v1/checkout/upazilas/:district
// @access  Public
export const getUpazilas = async (req, res) => {
    try {
        const { district } = req.params;

        const districtDoc = await District.findOne({ name: district, isActive: true });
        if (!districtDoc || districtDoc.upazilas.length === 0) {
            return res.status(404).json({ success: false, message: 'District not found' });
        }

        res.status(200).json({ success: true, upazilas: districtDoc.upazilas });
    } catch (error) {
        console.error('Get upazilas error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch upazilas' });
    }
};


// @desc    Get courier branches by district
// @route   GET /api/v1/checkout/courier-branches/:district
// @access  Public
export const getCourierBranches = async (req, res) => {
    try {
        const { district } = req.params;

        console.log('🔍 Searching for district:', district);

        const record = await CourierBranch.findOne({
            district: { $regex: new RegExp(`^${district}$`, 'i') },
            isActive: true
        });

        if (record) {
            console.log('✅ Found:', record.district, 'Branches:', record.branches);
            return res.status(200).json({
                success: true,
                branches: record.branches
            });
        }

        const allActive = await CourierBranch.find({ isActive: true }).select('district');
        console.log('📋 Available districts with courier service:', allActive.map(r => r.district));

        res.status(200).json({
            success: true,
            branches: []
        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch courier branches',
            branches: []
        });
    }
};


// @desc    Validate location and return locationType + available delivery types
// @route   POST /api/v1/checkout/validate-location
// @access  Public
export const validateLocation = async (req, res) => {
    try {
        const { district, upazila } = req.body;

        if (!district || !upazila) {
            return res.status(400).json({
                success: false,
                message: 'District and upazila are required'
            });
        }

        const districtDoc = await District.findOne({ name: district, isActive: true });
        if (!districtDoc) {
            return res.status(400).json({ success: false, message: 'Invalid district' });
        }

        const upazilaObj = districtDoc.upazilas.find(u => u.name === upazila);
        if (!upazilaObj) {
            return res.status(400).json({ success: false, message: 'Invalid upazila' });
        }

        const locationType = shippingZoneToLocationType(upazilaObj.shippingZone);

        const availableDeliveryTypes = isHomeDeliveryOnly(locationType)
            ? ['Home Delivery']
            : ['Courier', 'Home Delivery'];

        res.status(200).json({
            success: true,
            locationType,
            shippingZone: upazilaObj.shippingZone,
            availableDeliveryTypes
        });

    } catch (error) {
        console.error('Location validation error:', error);
        res.status(500).json({ success: false, message: 'Failed to validate location' });
    }
};


// @desc    Validate location type (alias)
// @route   POST /api/v1/checkout/validate-location-type
// @access  Public
export const validateLocationType = async (req, res) => {
    try {
        const { district, upazila } = req.body;

        if (!district || !upazila) {
            return res.status(400).json({
                success: false,
                message: 'District and upazila are required'
            });
        }

        const districtDoc = await District.findOne({ name: district, isActive: true });
        if (!districtDoc) {
            return res.status(400).json({ success: false, message: 'Invalid district' });
        }

        const upazilaObj = districtDoc.upazilas.find(u => u.name === upazila);
        if (!upazilaObj) {
            return res.status(400).json({ success: false, message: 'Invalid upazila' });
        }

        const locationType = shippingZoneToLocationType(upazilaObj.shippingZone);

        res.status(200).json({
            success: true,
            locationType,
            shippingZone: upazilaObj.shippingZone,
            availableDeliveryTypes: isHomeDeliveryOnly(locationType)
                ? ['Home Delivery']
                : ['Courier', 'Home Delivery']
        });

    } catch (error) {
        console.error('Validate location type error:', error);
        res.status(500).json({ success: false, message: 'Failed to validate location' });
    }
};


// @desc    Calculate checkout totals (shipping, discount, tax, final total)
// @route   POST /api/v1/checkout/calculate
// @access  Public / Private
export const calculateCheckoutData = async (req, res, next) => {
    try {
        const {
            isGuest,
            shippingAddress,
            couponCode,
            guestItems,
            locationType,
            deliveryType,
            paymentMethod,
            courierBranch
        } = req.body;

        const userId = req.user?.id;

        // ─── Step 1: Items ────────────────────────────────────────────────
        let itemsToProcess = [];

        if (isGuest) {
            if (!guestItems || guestItems.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No items provided for calculation'
                });
            }
            itemsToProcess = guestItems;
        } else {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
            if (!cart || cart.items.length === 0) {
                return res.status(400).json({ success: false, message: 'Cart is empty' });
            }
            itemsToProcess = cart.items;
        }

        // ─── Step 2: Subtotal ──────────────────────────────────────────────
        const itemsSubtotal = itemsToProcess.reduce(
            (acc, item) => acc + (parseFloat(item.priceAtPurchase || item.price || 0) * (item.quantity || 1)),
            0
        );

        // ─── Step 3: Coupon ────────────────────────────────────────────────
        let discountAmount = 0;
        let isFreeShippingByCoupon = false;
        let couponMessage = '';

        if (couponCode) {
            const couponResult = await applyCouponLogic(
                couponCode.toUpperCase(),
                itemsSubtotal,
                itemsToProcess,
                userId
            );
            discountAmount = couponResult.discountAmount;
            isFreeShippingByCoupon = couponResult.isFreeShipping;
            couponMessage = couponResult.validationMessage;
        }

        // ─── Step 4: locationType validation ──────────────────────────────
        const validLocationTypes = ['dhaka_inside', 'dhaka_sub', 'outside_dhaka'];
        if (!locationType || !validLocationTypes.includes(locationType)) {
            return res.status(400).json({
                success: false,
                message: 'Valid location type is required (dhaka_inside / dhaka_sub / outside_dhaka)'
            });
        }

        // ─── Step 5: deliveryType validation ──────────────────────────────
        let finalDeliveryType = deliveryType;

        if (isHomeDeliveryOnly(locationType)) {
            // Dhaka Inside & Dhaka Sub — শুধু Home Delivery
            if (deliveryType && deliveryType === 'Courier') {
                return res.status(400).json({
                    success: false,
                    message: `Courier service not available for ${locationType === 'dhaka_inside' ? 'Dhaka Inside' : 'Dhaka Sub'}`
                });
            }
            finalDeliveryType = 'Home Delivery';

        } else {
            // outside_dhaka — Courier বা Home Delivery
            if (!deliveryType || !['Courier', 'Home Delivery'].includes(deliveryType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid delivery type is required for outside Dhaka (Courier/Home Delivery)'
                });
            }
            if (deliveryType === 'Courier' && !courierBranch) {
                return res.status(400).json({
                    success: false,
                    message: 'Courier branch selection is required'
                });
            }
            finalDeliveryType = deliveryType;
        }

        // ─── Step 6: Payment method validation ────────────────────────────
        if (!paymentMethod || !['COD', 'SSLCommerz'].includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Valid payment method is required (COD/SSLCommerz)'
            });
        }

        const isCOD = paymentMethod === 'COD';
        const orderAmountAfterDiscount = itemsSubtotal - discountAmount;

        // ─── Step 7: District/Upazila validation (Home Delivery only) ─────
        let upazila = null;

        if (finalDeliveryType === 'Home Delivery') {
            if (!shippingAddress || !shippingAddress.district || !shippingAddress.upazila) {
                return res.status(200).json({
                    success: true,
                    data: {
                        itemsSubtotal: parseFloat(itemsSubtotal.toFixed(2)),
                        discountAmount: parseFloat(discountAmount.toFixed(2)),
                        shippingPrice: 0,
                        taxPrice: 0,
                        finalTotal: parseFloat((itemsSubtotal - discountAmount).toFixed(2)),
                        locationType,
                        deliveryType: finalDeliveryType,
                        paymentMethod,
                        isCOD,
                        codCharge: 0,
                        courierBranch: null,
                        couponMessage,
                        message: 'Please provide complete shipping address for delivery'
                    }
                });
            }

            const districtDoc = await District.findOne({
                name: shippingAddress.district,
                isActive: true
            });
            if (!districtDoc) {
                return res.status(400).json({ success: false, message: 'Invalid district' });
            }

            upazila = districtDoc.upazilas.find(u => u.name === shippingAddress.upazila);
            if (!upazila) {
                return res.status(400).json({ success: false, message: 'Invalid upazila' });
            }
        }

        // ─── Step 8: Shipping rate — DB থেকে ──────────────────────────────
        const rateDoc = await ShippingRate.findOne({
            locationType,
            deliveryType: finalDeliveryType,
            isActive: true
        });

        if (!rateDoc) {
            return res.status(400).json({
                success: false,
                message: 'Shipping rate configuration not found. Please contact support.'
            });
        }

        let shippingPrice = rateDoc.baseCharge;

        if (rateDoc.freeShippingThreshold && orderAmountAfterDiscount >= rateDoc.freeShippingThreshold) {
            shippingPrice = 0;
        } else if (
            rateDoc.reducedShippingThreshold &&
            rateDoc.reducedShippingAmount !== null &&
            orderAmountAfterDiscount >= rateDoc.reducedShippingThreshold
        ) {
            shippingPrice = Math.min(shippingPrice, rateDoc.reducedShippingAmount);
        }

        if (isFreeShippingByCoupon) {
            shippingPrice = 0;
        }

        const baseShippingPrice = shippingPrice;
        const codCharge = isCOD ? rateDoc.codCharge : 0;

        if (isCOD) {
            shippingPrice = baseShippingPrice + codCharge;
        }

        // ─── Step 9: Tax & Final total ─────────────────────────────────────
        const taxRate = parseFloat(process.env.VAT_RATE) || 0;
        const taxPrice = (itemsSubtotal - discountAmount) * taxRate;
        const finalTotal = itemsSubtotal - discountAmount + shippingPrice + taxPrice;

        // ─── Step 10: Estimated delivery ──────────────────────────────────
        let estimatedDelivery = '';
        if (locationType === 'dhaka_inside') {
            estimatedDelivery = '1-2 days';
        } else if (locationType === 'dhaka_sub') {
            estimatedDelivery = '1-3 days';
        } else {
            estimatedDelivery = finalDeliveryType === 'Courier' ? '2-4 days' : '3-5 days';
        }

        // ─── Final Response ────────────────────────────────────────────────
        res.status(200).json({
            success: true,
            data: {
                itemsSubtotal: parseFloat(itemsSubtotal.toFixed(2)),
                discountAmount: parseFloat(discountAmount.toFixed(2)),
                shippingPrice: parseFloat(shippingPrice.toFixed(2)),
                taxPrice: parseFloat(taxPrice.toFixed(2)),
                finalTotal: parseFloat(finalTotal.toFixed(2)),
                estimatedDelivery,
                shippingZone: upazila ? upazila.shippingZone : null,
                locationType,
                deliveryType: finalDeliveryType,
                paymentMethod,
                isCOD,
                codCharge,
                courierBranch: finalDeliveryType === 'Courier' ? courierBranch : null,
                couponMessage,
                breakdown: {
                    subtotal: parseFloat(itemsSubtotal.toFixed(2)),
                    discount: parseFloat(discountAmount.toFixed(2)),
                    baseShipping: parseFloat(baseShippingPrice.toFixed(2)),
                    codCharge,
                    tax: parseFloat(taxPrice.toFixed(2)),
                    total: parseFloat(finalTotal.toFixed(2))
                }
            }
        });

    } catch (error) {
        console.error('Checkout calculation error:', error);
        next(error);
    }
};


// @desc    Get all districts that have courier service
// @route   GET /api/v1/checkout/courier-districts
// @access  Public
export const getCourierDistricts = async (req, res) => {
    try {
        const courierDistricts = await CourierBranch.find({ isActive: true })
            .select('district branches')
            .sort({ district: 1 });

        const formattedDistricts = courierDistricts.map(item => ({
            district: item.district,
            branches: item.branches
        }));

        res.status(200).json({
            success: true,
            districts: formattedDistricts
        });
    } catch (error) {
        console.error('Get courier districts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch courier districts',
            districts: []
        });
    }
};