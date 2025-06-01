const Spoilage = require("../models/Spoilage");
const Item = require("../models/Item");
const Category = require("../models/Category");

// Get all spoilage records for a restaurant
exports.getAllSpoilageRecords = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { startDate, endDate, itemId, categoryId } = req.query;

    // Build filter
    const filter = { restaurantId };
    if (itemId) filter.itemId = itemId;
    if (categoryId) filter.categoryId = categoryId;

    // Date range filter
    if (startDate || endDate) {
      filter.spoilDate = {};
      if (startDate) filter.spoilDate.$gte = new Date(startDate);
      if (endDate) filter.spoilDate.$lte = new Date(endDate);
    }

    const spoilageRecords = await Spoilage.find(filter)
      .populate("itemId", "name price")
      .populate("categoryId", "name")
      .populate("vendorId", "name")
      .sort({ spoilDate: -1 });

    res.json(spoilageRecords);
  } catch (err) {
    console.error("Error getting spoilage records:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new spoilage record
exports.createSpoilageRecord = async (req, res) => {
  try {
    const {
      itemId,
      spoiledQuantity,
      reason,
      notes,
      vendorId,
      imageUrl,
      reportedBy,
      
    } = req.body;

    // ✅ Correctly assign restaurantId from the user object
    const restaurantId = req.user.restaurantId;

    // ✅ Validate required fields
    if (!itemId || !spoiledQuantity || !reason ) {
      return res.status(400).json({
        message: "Item ID, spoiled quantity, reason are required",
      });
    }

    // ✅ Check item existence and restaurant ownership
    const item = await Item.findOne({ _id: itemId, restaurantId });
    if (!item) {
      return res
        .status(404)
        .json({
          message: "Item not found or does not belong to your restaurant",
        });
    }

    if (item.quantity < spoiledQuantity) {
      return res.status(400).json({
        message: `Insufficient quantity. Available: ${item.quantity}`,
      });
    }

    const category = await Category.findById(item.categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // ✅ Create the spoilage record
    const spoilageRecord = new Spoilage({
      itemId,
      itemName: item.name,
      restaurantId,
      categoryId: item.categoryId,
      spoiledQuantity,
      price: item.price,
      reason,
      notes: notes || "",
      reportedBy, // Now using the name from request body
      vendorId,
      imageUrl,
    });

    await spoilageRecord.save();

    // ✅ Reduce the item quantity
    await Item.findByIdAndUpdate(itemId, {
      $inc: { quantity: -spoiledQuantity },
    });

    // ✅ Populate the spoilage record (remove reportedBy population since it's now a string)
    const populatedRecord = await Spoilage.findById(spoilageRecord._id)
      .populate("itemId", "name price")
      .populate("categoryId", "name")
      .populate("vendorId", "name");

    res.status(201).json(populatedRecord);
  } catch (err) {
    console.error("Error creating spoilage record:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get spoilage record by ID
exports.getSpoilageRecordById = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const spoilageRecord = await Spoilage.findOne({
      _id: req.params.id,
      restaurantId,
    })
      .populate("itemId", "name price")
      .populate("categoryId", "name")
      .populate("reportedBy", "name email")
      .populate("vendorId", "name");

    if (!spoilageRecord) {
      return res.status(404).json({ message: "Spoilage record not found" });
    }

    res.json(spoilageRecord);
  } catch (err) {
    console.error("Error getting spoilage record:", err);
    res.status(500).json({ message: "Server error" });
  }
};





// Delete spoilage record
exports.deleteSpoilageRecord = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;

    const spoilageRecord = await Spoilage.findOne({
      _id: req.params.id,
      restaurantId,
    });

    if (!spoilageRecord) {
      return res.status(404).json({ message: "Spoilage record not found" });
    }

    // Restore item quantity before deleting
    await Item.findByIdAndUpdate(spoilageRecord.itemId, {
      $inc: { quantity: spoilageRecord.spoiledQuantity },
    });

    await Spoilage.findByIdAndDelete(req.params.id);

    res.json({ message: "Spoilage record deleted successfully" });
  } catch (err) {
    console.error("Error deleting spoilage record:", err);
    res.status(500).json({ message: "Server error" });
  }
};
