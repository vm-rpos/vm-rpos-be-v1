const Vendor = require('../models/Vendor');

//Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.json(vendors);
  } catch (err) {
    console.error('Error fetching vendors:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new vendor
exports.createVendor = async (req, res) => {
  try {
    const { name, age, phoneNumber, location } = req.body;

    if (!name || !age || !phoneNumber || !location) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if phone number already exists
    const existingVendor = await Vendor.findOne({ phoneNumber });
    if (existingVendor) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    const newVendor = new Vendor({ name, age, phoneNumber, location });
    await newVendor.save();

    res.status(201).json(newVendor);
  } catch (err) {
    console.error('Error creating vendor:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a single vendor by ID
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    res.json(vendor);
  } catch (err) {
    console.error('Error fetching vendor:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a vendor
exports.updateVendor = async (req, res) => {
  try {
    const { name, age, phoneNumber, location } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (age) updateData.age = age;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (location) updateData.location = location;

    const updatedVendor = await Vendor.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedVendor) return res.status(404).json({ message: 'Vendor not found' });

    res.json(updatedVendor);
  } catch (err) {
    console.error('Error updating vendor:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a vendor
exports.deleteVendor = async (req, res) => {
  try {
    const deletedVendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!deletedVendor) return res.status(404).json({ message: 'Vendor not found' });

    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    console.error('Error deleting vendor:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
