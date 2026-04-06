import mongoose from 'mongoose';

const upazilaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shippingZone: {
    type: String,
    required: true,
    enum: ['dhaka_city', 'dhaka_sub', 'dhaka_outside', 'other_district']
    // dhaka_city    → Dhaka Inside  (Dhaka City থানাগুলো)
    // dhaka_sub     → Dhaka Sub     (Gazipur, Narayanganj, Savar, Keraniganj ইত্যাদি)
    // dhaka_outside → Dhaka Out     (Dhaka Division এর বাকি জেলা)
    // other_district→ Outside Dhaka Division
  }
}, { _id: true });

const districtSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  upazilas: [upazilaSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const courierBranchSchema = new mongoose.Schema({
  district: { type: String, required: true },
  branches: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Shipping charge config — per locationType+deliveryType combo
const shippingRateSchema = new mongoose.Schema({
  locationType: {
    type: String,
    required: true,
    enum: ['dhaka_inside', 'dhaka_sub', 'outside_dhaka']
    // dhaka_inside  → Dhaka City থানাগুলো (শুধু Home Delivery)
    // dhaka_sub     → Gazipur, Narayanganj ইত্যাদি (শুধু Home Delivery)
    // outside_dhaka → Dhaka Division এর বাইরে + Dhaka Division এর দূরবর্তী (Courier বা Home Delivery)
  },
  deliveryType: {
    type: String,
    required: true,
    enum: ['Home Delivery', 'Courier']
  },
  baseCharge: { type: Number, required: true, default: 0 },
  codCharge: { type: Number, required: true, default: 187 },
  freeShippingThreshold: { type: Number, default: null },
  reducedShippingThreshold: { type: Number, default: null },
  reducedShippingAmount: { type: Number, default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Compound unique index
shippingRateSchema.index({ locationType: 1, deliveryType: 1 }, { unique: true });

export const District = mongoose.model('District', districtSchema);
export const CourierBranch = mongoose.model('CourierBranch', courierBranchSchema);
export const ShippingRate = mongoose.model('ShippingRate', shippingRateSchema);