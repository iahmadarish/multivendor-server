// controllers/admin.shippingController.js
import { District, CourierBranch, ShippingRate } from '../models/ShippingConfig.model.js';

// ==================== DISTRICTS ====================

// GET /api/v1/admin/shipping/districts
export const getAllDistricts = async (req, res) => {
  try {
    const districts = await District.find().sort({ name: 1 });
    res.json({ success: true, count: districts.length, districts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/v1/admin/shipping/districts/:id
export const getDistrictById = async (req, res) => {
  try {
    const district = await District.findById(req.params.id);
    if (!district) return res.status(404).json({ success: false, message: 'District not found' });
    res.json({ success: true, district });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/admin/shipping/districts
export const createDistrict = async (req, res) => {
  try {
    const { name, upazilas, isActive } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'District name is required' });

    const exists = await District.findOne({ name });
    if (exists) return res.status(400).json({ success: false, message: 'District already exists' });

    const district = await District.create({ name, upazilas: upazilas || [], isActive });
    res.status(201).json({ success: true, message: 'District created', district });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/admin/shipping/districts/:id
export const updateDistrict = async (req, res) => {
  try {
    const { name, upazilas, isActive } = req.body;
    const district = await District.findByIdAndUpdate(
      req.params.id,
      { name, upazilas, isActive },
      { new: true, runValidators: true }
    );
    if (!district) return res.status(404).json({ success: false, message: 'District not found' });
    res.json({ success: true, message: 'District updated', district });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/admin/shipping/districts/:id
export const deleteDistrict = async (req, res) => {
  try {
    const district = await District.findByIdAndDelete(req.params.id);
    if (!district) return res.status(404).json({ success: false, message: 'District not found' });
    res.json({ success: true, message: 'District deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/admin/shipping/districts/:id/upazilas
export const addUpazila = async (req, res) => {
  try {
    const { name, shippingZone } = req.body;
    if (!name || !shippingZone) {
      return res.status(400).json({ success: false, message: 'name and shippingZone are required' });
    }

    const district = await District.findById(req.params.id);
    if (!district) return res.status(404).json({ success: false, message: 'District not found' });

    const alreadyExists = district.upazilas.find(u => u.name === name);
    if (alreadyExists) return res.status(400).json({ success: false, message: 'Upazila already exists' });

    district.upazilas.push({ name, shippingZone });
    await district.save();
    res.json({ success: true, message: 'Upazila added', district });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/admin/shipping/districts/:id/upazilas/:upazilaId
export const updateUpazila = async (req, res) => {
  try {
    const { name, shippingZone } = req.body;
    const district = await District.findById(req.params.id);
    if (!district) return res.status(404).json({ success: false, message: 'District not found' });

    const upazila = district.upazilas.id(req.params.upazilaId);
    if (!upazila) return res.status(404).json({ success: false, message: 'Upazila not found' });

    if (name) upazila.name = name;
    if (shippingZone) upazila.shippingZone = shippingZone;
    await district.save();

    res.json({ success: true, message: 'Upazila updated', district });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/admin/shipping/districts/:id/upazilas/:upazilaId
export const deleteUpazila = async (req, res) => {
  try {
    const district = await District.findById(req.params.id);
    if (!district) return res.status(404).json({ success: false, message: 'District not found' });

    district.upazilas = district.upazilas.filter(
      u => u._id.toString() !== req.params.upazilaId
    );
    await district.save();
    res.json({ success: true, message: 'Upazila deleted', district });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ==================== COURIER BRANCHES ====================

// GET /api/v1/admin/shipping/courier-branches
export const getAllCourierBranches = async (req, res) => {
  try {
    const branches = await CourierBranch.find().sort({ district: 1 });
    res.json({ success: true, count: branches.length, branches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/admin/shipping/courier-branches
export const createCourierBranch = async (req, res) => {
  try {
    const { district, branches } = req.body;
    if (!district) return res.status(400).json({ success: false, message: 'District is required' });

    const exists = await CourierBranch.findOne({ district });
    if (exists) return res.status(400).json({ success: false, message: 'Courier config for this district already exists. Use update instead.' });

    const record = await CourierBranch.create({ district, branches: branches || [] });
    res.status(201).json({ success: true, message: 'Courier branch config created', record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/admin/shipping/courier-branches/:id
export const updateCourierBranch = async (req, res) => {
  try {
    const { district, branches, isActive } = req.body;
    const record = await CourierBranch.findByIdAndUpdate(
      req.params.id,
      { district, branches, isActive },
      { new: true, runValidators: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Courier branch config not found' });
    res.json({ success: true, message: 'Courier branch config updated', record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/admin/shipping/courier-branches/:id
export const deleteCourierBranch = async (req, res) => {
  try {
    const record = await CourierBranch.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Courier branch config not found' });
    res.json({ success: true, message: 'Courier branch config deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/v1/admin/shipping/courier-branches/:id/add-branch
export const addBranchToDistrict = async (req, res) => {
  try {
    const { branchName } = req.body;
    if (!branchName) return res.status(400).json({ success: false, message: 'branchName is required' });

    const record = await CourierBranch.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });

    if (record.branches.includes(branchName)) {
      return res.status(400).json({ success: false, message: 'Branch already exists' });
    }

    record.branches.push(branchName);
    await record.save();
    res.json({ success: true, message: 'Branch added', record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/v1/admin/shipping/courier-branches/:id/remove-branch
export const removeBranchFromDistrict = async (req, res) => {
  try {
    const { branchName } = req.body;
    const record = await CourierBranch.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });

    record.branches = record.branches.filter(b => b !== branchName);
    await record.save();
    res.json({ success: true, message: 'Branch removed', record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ==================== SHIPPING RATES ====================

// GET /api/v1/admin/shipping/rates
export const getAllShippingRates = async (req, res) => {
  try {
    const rates = await ShippingRate.find().sort({ locationType: 1 });
    res.json({ success: true, rates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/v1/admin/shipping/rates/:id
export const updateShippingRate = async (req, res) => {
  try {
    const {
      baseCharge,
      codCharge,
      freeShippingThreshold,
      reducedShippingThreshold,
      reducedShippingAmount,
      isActive
    } = req.body;

    const rate = await ShippingRate.findByIdAndUpdate(
      req.params.id,
      {
        baseCharge,
        codCharge,
        freeShippingThreshold,
        reducedShippingThreshold,
        reducedShippingAmount,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!rate) return res.status(404).json({ success: false, message: 'Shipping rate not found' });
    res.json({ success: true, message: 'Shipping rate updated', rate });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};