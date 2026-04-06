

import Order from '../models/order.model.js';
import { verifyPayment } from '../config/sslcommerz.js';
import { updateProductStock } from './orderController.js';

const getClientUrl = () => {
    return process.env.CLIENT_URL || 
           (process.env.NODE_ENV === 'production' 
            ? 'https://minimoonira.vercel.app' 
            : 'http://localhost:5173');
};


export const handleSuccess = async (req, res) => {
    const { tran_id, status, val_id } = req.body;
    
    try {
        const order = await Order.findById(tran_id);

        if (!order) {
            return res.redirect(`${process.env.CLIENT_URL}/order/fail?message=OrderNotFound`);
        }

        // যদি অর্ডার ইতিমধ্যে প্রসেস করা হয়ে থাকে
        if (order.orderStatus !== 'Pending') {
            return res.redirect(`${process.env.CLIENT_URL}/order/success?orderId=${tran_id}`);
        }

        if (status === 'VALID' && val_id) {
            const isCODOrder = order.paymentMethod === 'COD';
            const expectedAmount = isCODOrder ? 187 : order.totalPrice;
            
            const verificationResult = await verifyPayment(val_id, tran_id, expectedAmount);

            if (verificationResult.isValid) {
                // ✅ COD অর্ডারের জন্য স্পেশাল হ্যান্ডলিং
                if (isCODOrder) {
                    order.orderStatus = 'Confirmed';
                    order.paymentStatus = 'Partially Paid';
                    order.paidAt = new Date();
                    
                    order.paymentResult = {
                        id: tran_id,
                        status: verificationResult.data.status,
                        method: 'SSLCommerz (COD Charge)',
                        update_time: new Date().toISOString(),
                        amount_paid: 187,
                        remaining_amount: order.totalPrice - 187
                    };
                    
                    // ✅ অ্যাডমিন নোট যোগ করুন
                    order.adminNotes = order.adminNotes || [];
                    order.adminNotes.push({
                        note: `COD charge of 187 BDT paid online. Remaining ${order.totalPrice - 187} BDT to be collected upon delivery.`,
                        addedBy: 'system',
                        addedAt: new Date()
                    });
                    
                    // ✅ স্ট্যাটাস হিস্ট্রি আপডেট
                    order.statusHistory.push({
                        status: 'Confirmed',
                        note: 'COD charge paid online. Order confirmed.',
                        updatedBy: 'system',
                        updatedAt: new Date()
                    });
                    
                } else {
                    // রেগুলার অনলাইন পেমেন্ট
                    order.orderStatus = 'Processing';
                    order.paymentStatus = 'Paid';
                    order.paidAt = new Date();
                    
                    order.paymentResult = {
                        id: tran_id,
                        status: verificationResult.data.status,
                        method: 'SSLCommerz',
                        update_time: new Date().toISOString(),
                        amount_paid: order.totalPrice,
                        remaining_amount: 0
                    };
                    
                    order.statusHistory.push({
                        status: 'Processing',
                        note: 'Full payment completed online',
                        updatedBy: 'system',
                        updatedAt: new Date()
                    });
                }
                
                // ✅ স্টক আপডেট (শুধু ডিক্রিমেন্ট)
                await updateProductStock(order.orderItems, 'decrease');
                
                await order.save({ validateBeforeSave: false });
                
                // ✅ সাফল্যের সাথে রিডাইরেক্ট
                return res.redirect(`${process.env.CLIENT_URL}/order/success?orderId=${tran_id}`);
                
            } else {
                console.error('Payment verification failed:', verificationResult);
                throw new Error('Payment verification failed');
            }
        }
        
    } catch (error) {
        console.error('Success Handler Error:', error);
        
        // এরর হলে অর্ডার ক্যান্সেল করুন
        try {
            const order = await Order.findById(tran_id);
            if (order && order.orderStatus === 'Pending') {
                order.orderStatus = 'Cancelled';
                order.paymentStatus = 'Failed';
                order.statusHistory.push({
                    status: 'Cancelled',
                    note: `Payment failed: ${error.message}`,
                    updatedBy: 'system',
                    updatedAt: new Date()
                });
                await order.save({ validateBeforeSave: false });
            }
        } catch (saveError) {
            console.error('Failed to cancel order:', saveError);
        }
        
        return res.redirect(`${process.env.CLIENT_URL}/order/fail?orderId=${tran_id}&error=${encodeURIComponent(error.message)}`);
    }
};

// @desc    Handle failed/cancelled payment
// @route   POST /api/v1/payment/fail, /api/v1/payment/cancel
// @access  Public (Called by SSL Commerz)
export const handleFailure = async (req, res) => {
    const { tran_id } = req.body;
    const order = await Order.findById(tran_id);
    if (order && order.orderStatus === 'Pending') {
        order.orderStatus = 'Cancelled';
        order.paymentStatus = 'Failed';
        await order.save();
    }
    return res.redirect(`${process.env.CLIENT_URL}/order/fail?orderId=${tran_id}`);
};

// @desc    Handle IPN (Instant Payment Notification)
// @route   POST /api/v1/payment/ipn
// @access  Public (Called by SSL Commerz - Server-to-Server)
export const handleIPN = async (req, res) => {
    const { tran_id, status, val_id, amount, isCOD } = req.body;

    if (status !== 'VALID' || !val_id) {
        return res.status(200).send('IPN Status not VALID or val_id missing. No action taken.');
    }

    try {
        const order = await Order.findById(tran_id);
const isActuallyCOD = order.paymentMethod === 'COD';

        if (!order) {
            console.error(`IPN: Order not found for tran_id: ${tran_id}`);
            return res.status(404).send('Order Not Found');
        }

        // যদি অর্ডার ইতিমধ্যে Processing বা Confirmed থাকে
        if (order.orderStatus === 'Processing' || order.orderStatus === 'Confirmed') {
            console.log(`IPN: Order ${tran_id} already processed`);
            return res.status(200).send('IPN Handled (Already Processed)');
        }

        // SSLCommerz সার্ভার-টু-সার্ভার ভেরিফিকেশন
        const verificationResult = await verifyPayment(val_id, tran_id, isActuallyCOD ? 187 : order.totalPrice);

        if (verificationResult.isValid) {
            // COD অর্ডারের বিশেষ লজিক
            if (isActuallyCOD && parseFloat(amount) === 187) {
                // শুধুমাত্র COD চার্জ (১৮৭ টাকা) পরিশোধিত হয়েছে
                console.log(`IPN: COD Charge paid for order ${tran_id}`);

                order.orderStatus = 'Confirmed';
                order.paymentStatus = 'Partially Paid';
                order.paidAt = Date.now();
                order.paymentResult = {
                    id: tran_id,
                    status: verificationResult.data.status,
                    method: 'SSLCommerz (COD Charge)',
                    update_time: new Date().toISOString(),
                    amount_paid: 187,
                    remaining_amount: order.totalPrice - 187
                };

                // COD অর্ডারের জন্য স্টক আপডেট (পূর্ণ অর্ডারের জন্য)
                await updateProductStock(order.orderItems, 'decrease');

                // COD অর্ডার ট্র্যাকিং
                order.adminNotes = order.adminNotes || [];
                order.adminNotes.push({
                    note: `COD charge of 187 BDT paid online. Remaining ${order.totalPrice - 187} BDT to be collected upon delivery.`,
                    addedBy: 'system',
                    addedAt: new Date()
                });

                console.log(`IPN: COD Order ${tran_id} confirmed - COD charge collected`);

            } else if (!isActuallyCOD) {
                // COD অর্ডারে ভুল এমাউন্ট
                console.error(`IPN: Wrong amount for COD order ${tran_id}. Expected 187, got ${amount}`);

                order.orderStatus = 'Cancelled';
                order.paymentStatus = 'Failed';
                order.adminNotes = order.adminNotes || [];
                order.adminNotes.push({
                    note: `COD order failed: Wrong amount paid. Expected 187 BDT, got ${amount} BDT.`,
                    addedBy: 'system',
                    addedAt: new Date()
                });

            } else {
                // রেগুলার অনলাইন পেমেন্ট (সম্পূর্ণ এমাউন্ট)
                console.log(`IPN: Regular payment for order ${tran_id}`);

                order.orderStatus = 'Processing';
                order.paymentStatus = 'Paid';
                order.paidAt = Date.now();
                order.paymentResult = {
                    id: tran_id,
                    status: verificationResult.data.status,
                    method: 'SSLCommerz',
                    update_time: new Date().toISOString(),
                    amount_paid: order.totalPrice,
                    remaining_amount: 0
                };

                // স্টক আপডেট
                await updateProductStock(order.orderItems, 'decrease');

                console.log(`IPN: Order ${tran_id} fully paid and processing`);
            }

            // অর্ডার স্ট্যাটাস হিস্ট্রি আপডেট
            order.statusHistory.push({
                status: order.orderStatus,
                note: isCOD ?
                    'COD charge paid online, waiting for delivery payment' :
                    'Full payment completed online',
                updatedBy: 'system',
                updatedAt: new Date()
            });

            await order.save();

            console.log(`IPN: Order ${tran_id} successfully processed. Status: ${order.orderStatus}, Payment: ${order.paymentStatus}`);

            res.status(200).send('IPN Handled Successfully');

        } else {
            console.error(`IPN: Payment verification failed for order ${tran_id}`);

            order.orderStatus = 'Cancelled';
            order.paymentStatus = 'Failed';

            order.statusHistory.push({
                status: 'Cancelled',
                note: 'Payment verification failed by SSLCommerz',
                updatedBy: 'system',
                updatedAt: new Date()
            });

            await order.save();

            console.error(`IPN: Order ${tran_id} validation failed.`);
            res.status(200).send('IPN Validation Failed');
        }

    } catch (error) {
        console.error('IPN processing error:', error);

        const order = await Order.findById(tran_id);
        if (order) {
            order.adminNotes = order.adminNotes || [];
            order.adminNotes.push({
                note: `IPN processing error: ${error.message}`,
                addedBy: 'system',
                addedAt: new Date()
            });
            await order.save();
        }

        res.status(500).send('IPN Server Error');
    }
};


export const processSuccessRedirect = async (req, res) => {
    console.log('🟢 PROCESS SUCCESS REDIRECT CALLED 🟢');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Query:', req.query);
    
    try {
        const { orderId, val_id, status } = req.query;
        const CLIENT_URL = getClientUrl();
        
        if (!orderId) {
            console.error('❌ No orderId');
            return res.redirect(`${CLIENT_URL}/order/fail?message=NoOrderID`);
        }
        
        console.log('🔵 Processing order:', orderId);
        console.log('🔵 Client URL:', CLIENT_URL);
        
        // অর্ডার খুঁজুন
        const order = await Order.findById(orderId);
        
        if (!order) {
            console.error(`❌ Order not found: ${orderId}`);
            return res.redirect(`${CLIENT_URL}/order/fail?message=OrderNotFound`);
        }
        
        console.log('✅ Order found:', {
            orderNumber: order.orderNumber,
            status: order.orderStatus,
            paymentMethod: order.paymentMethod
        });
        
        // যদি ইতিমধ্যে প্রসেস করা হয়ে থাকে
        if (order.orderStatus !== 'Pending') {
            console.log(`✅ Already processed: ${order.orderStatus}`);
            return res.redirect(`${CLIENT_URL}/order/success?orderId=${orderId}&orderNumber=${order.orderNumber}`);
        }
        
        // SSLCommerz ভেরিফিকেশন
        let isVerified = false;
        
        if (val_id && status === 'VALID') {
            const isCOD = order.paymentMethod === 'COD';
            const expectedAmount = isCOD ? 187 : order.totalPrice;
            
            console.log('🔵 Verifying payment:', { val_id, isCOD, expectedAmount });
            
            const verification = await verifyPayment(val_id, orderId, expectedAmount);
            isVerified = verification.isValid;
            
            console.log('🔵 Verification result:', { isValid: verification.isValid });
        } else {
            console.log('⚠️ No val_id, skipping verification');
            isVerified = true; // Development-এ skip করি
        }
        
        if (isVerified) {
            // অর্ডার আপডেট করুন
            if (order.paymentMethod === 'COD') {
                order.orderStatus = 'Confirmed';
                order.paymentStatus = 'Partially Paid';
                order.paidAt = new Date();
                order.paymentResult = {
                    id: orderId,
                    status: 'VALID',
                    method: 'SSLCommerz (COD Charge)',
                    update_time: new Date().toISOString(),
                    amount_paid: 187
                };
                console.log('✅ COD order confirmed');
            } else {
                order.orderStatus = 'Processing';
                order.paymentStatus = 'Paid';
                order.paidAt = new Date();
                console.log('✅ Full payment processed');
            }
            
            // স্টক আপডেট
            try {
                await updateProductStock(order.orderItems, 'decrease');
                console.log('✅ Stock updated');
            } catch (stockError) {
                console.error('❌ Stock error:', stockError);
            }
            
            await order.save({ validateBeforeSave: false });
            console.log('✅ Order saved');
            
            // রিডাইরেক্ট
            const redirectUrl = `${CLIENT_URL}/order/success?orderId=${orderId}&orderNumber=${order.orderNumber}`;
            console.log(`✅ Redirecting to: ${redirectUrl}`);
            return res.redirect(redirectUrl);
            
        } else {
            console.error('❌ Verification failed');
            order.orderStatus = 'Cancelled';
            order.paymentStatus = 'Failed';
            await order.save({ validateBeforeSave: false });
            
            return res.redirect(`${CLIENT_URL}/order/fail?orderId=${orderId}&reason=verification_failed`);
        }
        
    } catch (error) {
        console.error('❌ processSuccessRedirect error:', error);
        const CLIENT_URL = getClientUrl();
        const orderId = req.query.orderId;
        return res.redirect(`${CLIENT_URL}/order/fail?orderId=${orderId || ''}&error=server_error`);
    }
};

/**
 * @desc Process failed payment and redirect to frontend fail page
 * @route GET /api/v1/payment/process-fail
 * @access Public
 */
export const processFailRedirect = async (req, res) => {
    const CLIENT_URL = getClientUrl();
    const { orderId } = req.query;
    
    if (orderId) {
        const order = await Order.findById(orderId);
        if (order && order.orderStatus === 'Pending') {
            order.orderStatus = 'Cancelled';
            order.paymentStatus = 'Failed';
            await order.save({ validateBeforeSave: false });
        }
    }
    
    return res.redirect(`${CLIENT_URL}/order/fail?orderId=${orderId || ''}`);
};


/**
 * @desc Process cancelled payment and redirect to frontend fail page
 * @route GET /api/v1/payment/process-cancel
 * @access Public
 */

export const processCancelRedirect = async (req, res) => {
    const CLIENT_URL = getClientUrl();
    const { orderId } = req.query;
    
    if (orderId) {
        const order = await Order.findById(orderId);
        if (order && order.orderStatus === 'Pending') {
            order.orderStatus = 'Cancelled';
            order.paymentStatus = 'Failed';
            await order.save({ validateBeforeSave: false });
        }
    }
    
    return res.redirect(`${CLIENT_URL}/order/fail?orderId=${orderId || ''}&reason=cancelled`);
};