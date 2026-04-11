import Promotion from './promotion.model.js';
import Campaign from '../campaign/campaign.model.js';
import Cart from '../cart/cart.model.js';
import { sendPromotionEmail } from '../../utils/emailService.js';


export const createAbandonedCartPromotion = async (req, res, next) => {
  try {
    const {
      name,
      description,
      discountType,
      discountValue,
      minimumCartValue,
      applicableProducts,
      excludedProducts,
      durationHours = 24
    } = req.body;

    const promotion = await Promotion.create({
      name,
      description,
      type: 'abandoned_cart',
      targetUsers: 'abandoned_cart_users',
      discountType,
      discountValue,
      minimumCartValue,
      applicableProducts,
      excludedProducts,
      startDate: new Date(),
      endDate: new Date(Date.now() + durationHours * 60 * 60 * 1000)
    });


    const abandonedCarts = await Cart.aggregate([
      {
        $match: {
          'items.0': { $exists: true },
          updatedAt: {
            $lte: new Date(Date.now() - 2 * 60 * 60 * 1000)
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      }
    ]);


    for (const cart of abandonedCarts) {
      const campaign = await Campaign.create({
        user: cart.user,
        promotion: promotion._id,
        cartItems: cart.items,
        expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000)
      });
      await sendPromotionEmail({
        to: cart.userInfo.email,
        name: cart.userInfo.name,
        promotionName: name,
        discountValue: discountValue,
        discountType: discountType,
        expiryHours: durationHours,
        campaignId: campaign._id
      });
      await Promotion.findByIdAndUpdate(promotion._id, {
        $addToSet: { notificationSent: cart.user }
      });
    }
    res.status(201).json({
      success: true,
      message: `Promotion created and notifications sent to ${abandonedCarts.length} users`,
      promotion
    });

  } catch (error) {
    next(error);
  }
};


export const getUserCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find({
      user: req.user.id,
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).populate('promotion').populate('cartItems.product');
    res.status(200).json({
      success: true,
      campaigns
    });
  } catch (error) {
    next(error);
  }
};


export const applyCampaignToCart = async (req, res, next) => {
  try {
    const { campaignId } = req.body;
    const campaign = await Campaign.findOne({
      _id: campaignId,
      user: req.user.id,
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).populate('promotion');
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found or expired'
      });
    }

    campaign.status = 'used';
    campaign.usedAt = new Date();
    await campaign.save();
    res.status(200).json({
      success: true,
      message: 'Campaign applied successfully',
      campaign
    });
  } catch (error) {
    next(error);
  }
};