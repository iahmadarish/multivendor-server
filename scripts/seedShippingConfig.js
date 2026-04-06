// scripts/seedShippingConfig.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { District, CourierBranch, ShippingRate } from '../models/ShippingConfig.model.js';
import { districtsData } from '../data/districts.js';

dotenv.config();

const courierBranchesData = [
  { district: 'Dhaka',       branches: ['Mirpur 1', 'Mirpur 10', 'Dhanmondi', 'Gulshan', 'Uttara'] },
  { district: 'Chattogram',  branches: ['Agrabad', 'Chawkbazar', 'GEC Circle'] },
  { district: 'Gazipur',     branches: ['Gazipur City', 'Tongi'] },
  { district: 'Narayanganj', branches: ['Narayanganj Sadar', 'Rupganj'] },
  { district: 'Rajshahi',    branches: ['Rajshahi City', 'Paba'] },
  { district: 'Khulna',      branches: ['Khulna City', 'Dumuria'] },
  { district: 'Barishal',    branches: ['Barishal City', 'Gournadi'] },
  { district: 'Sylhet',      branches: ['Sylhet City', 'Companiganj'] },
];

// ─── নতুন 3-zone Shipping Rates ───────────────────────────────────────────────
// locationType: 'dhaka_inside' | 'dhaka_sub' | 'outside_dhaka'
//
//   dhaka_inside  → Dhaka City থানা       → শুধু Home Delivery
//   dhaka_sub     → Gazipur, Narayanganj  → শুধু Home Delivery
//   outside_dhaka → বাকি সব              → Home Delivery + Courier
const shippingRatesData = [
  {
    locationType:             'dhaka_inside',
    deliveryType:             'Home Delivery',
    baseCharge:               100,   // ← আপনার দাম অনুযায়ী পরিবর্তন করুন
    codCharge:                187,
    freeShippingThreshold:    null,
    reducedShippingThreshold: null,
    reducedShippingAmount:    null,
  },
  {
    locationType:             'dhaka_sub',
    deliveryType:             'Home Delivery',
    baseCharge:               130,   // ← আপনার দাম অনুযায়ী পরিবর্তন করুন
    codCharge:                187,
    freeShippingThreshold:    null,
    reducedShippingThreshold: null,
    reducedShippingAmount:    null,
  },
  {
    locationType:             'outside_dhaka',
    deliveryType:             'Home Delivery',
    baseCharge:               200,   // ← আপনার দাম অনুযায়ী পরিবর্তন করুন
    codCharge:                187,
    freeShippingThreshold:    null,
    reducedShippingThreshold: null,
    reducedShippingAmount:    null,
  },
  {
    locationType:             'outside_dhaka',
    deliveryType:             'Courier',
    baseCharge:               130,   // ← আপনার দাম অনুযায়ী পরিবর্তন করুন
    codCharge:                187,
    freeShippingThreshold:    null,
    reducedShippingThreshold: null,
    reducedShippingAmount:    null,
  },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  // ── Districts ──────────────────────────────────────────────────────────────
  await District.deleteMany({});
  await District.insertMany(
    districtsData.map(d => ({ name: d.name, upazilas: d.upazilas, isActive: true }))
  );
  console.log(`✅ ${districtsData.length} districts seeded`);

  // ── Courier Branches ───────────────────────────────────────────────────────
  await CourierBranch.deleteMany({});
  await CourierBranch.insertMany(courierBranchesData);
  console.log(`✅ ${courierBranchesData.length} courier branch configs seeded`);

  // ── Shipping Rates (3-zone) ────────────────────────────────────────────────
  await ShippingRate.deleteMany({});
  await ShippingRate.insertMany(shippingRatesData);
  console.log(`✅ ${shippingRatesData.length} shipping rates seeded`);
  console.log('   → dhaka_inside  / Home Delivery : ৳' + shippingRatesData[0].baseCharge);
  console.log('   → dhaka_sub     / Home Delivery : ৳' + shippingRatesData[1].baseCharge);
  console.log('   → outside_dhaka / Home Delivery : ৳' + shippingRatesData[2].baseCharge);
  console.log('   → outside_dhaka / Courier       : ৳' + shippingRatesData[3].baseCharge);

  await mongoose.disconnect();
  console.log('Done ✅');
};

seed().catch(console.error);