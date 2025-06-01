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
      .populate("reportedBy", "name email")
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
    } = req.body;

    // ✅ Correctly assign restaurantId from the user object
    const restaurantId = req.user.restaurantId;
    const reportedBy = req.user._id;

    // ✅ Validate required fields
    if (!itemId || !spoiledQuantity || !reason) {
      return res.status(400).json({
        message: "Item ID, spoiled quantity, and reason are required",
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
      reportedBy,
      vendorId,
      imageUrl,
    });
    console.log(spoilageRecord);
    await spoilageRecord.save();

    // ✅ Reduce the item quantity
    await Item.findByIdAndUpdate(itemId, {
      $inc: { quantity: -spoiledQuantity },
    });

    // ✅ Populate the spoilage record
    const populatedRecord = await Spoilage.findById(spoilageRecord._id)
      .populate("itemId", "name price")
      .populate("categoryId", "name")
      .populate("reportedBy", "name email")
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

// Update spoilage record
exports.updateSpoilageRecord = async (req, res) => {
  try {
    const {
      reason,
      notes,
      vendorId,
      imageUrl,
    } = req.body;

    const restaurantId = req.user.restaurantId;

    const spoilageRecord = await Spoilage.findOne({
      _id: req.params.id,
      restaurantId,
    });

    if (!spoilageRecord) {
      return res.status(404).json({ message: "Spoilage record not found" });
    }

    const updateData = {};
    if (reason !== undefined) updateData.reason = reason;
    if (notes !== undefined) updateData.notes = notes;
    if (vendorId !== undefined) updateData.vendorId = vendorId;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const updatedRecord = await Spoilage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .populate("itemId", "name price")
      .populate("categoryId", "name")
      .populate("reportedBy", "name email")
      .populate("vendorId", "name");

    res.json(updatedRecord);
  } catch (err) {
    console.error("Error updating spoilage record:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Approve or reject spoilage record
exports.approveSpoilageRecord = async (req, res) => {
  try {
    const { status, approvalNotes } = req.body; // status: 'Approved' or 'Rejected'
    const restaurantId = req.user.restaurantId;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be either Approved or Rejected",
      });
    }

    const spoilageRecord = await Spoilage.findOne({
      _id: req.params.id,
      restaurantId,
    });

    if (!spoilageRecord) {
      return res.status(404).json({ message: "Spoilage record not found" });
    }

    if (spoilageRecord.status !== "Pending") {
      return res.status(400).json({
        message: "Spoilage record has already been processed",
      });
    }

    // If rejecting, restore the item quantity
    if (status === "Rejected") {
      await Item.findByIdAndUpdate(spoilageRecord.itemId, {
        $inc: { quantity: spoilageRecord.spoiledQuantity },
      });
    }

    const updatedRecord = await Spoilage.findByIdAndUpdate(
      req.params.id,
      {
        status,
        isApproved: status === "Approved",
        notes: approvalNotes || spoilageRecord.notes,
      },
      { new: true }
    )
      .populate("itemId", "name price")
      .populate("categoryId", "name")
      .populate("reportedBy", "name email")
      .populate("vendorId", "name");

    res.json(updatedRecord);
  } catch (err) {
    console.error("Error approving spoilage record:", err);
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

// Get spoilage analytics
exports.getSpoilageAnalytics = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = { restaurantId, status: "Approved" };
    if (startDate || endDate) {
      dateFilter.spoilDate = {};
      if (startDate) dateFilter.spoilDate.$gte = new Date(startDate);
      if (endDate) dateFilter.spoilDate.$lte = new Date(endDate);
    }

    // Total loss value
    const totalLossResult = await Spoilage.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, totalLoss: { $sum: "$totalLossValue" } } },
    ]);

    // Spoilage by reason
    const spoilageByReason = await Spoilage.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$reason",
          count: { $sum: 1 },
          totalLoss: { $sum: "$totalLossValue" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Spoilage by category
    const spoilageByCategory = await Spoilage.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: "categories",
          localField: "categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $group: {
          _id: "$category.name",
          count: { $sum: 1 },
          totalLoss: { $sum: "$totalLossValue" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Top spoiled items
    const topSpoiledItems = await Spoilage.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$itemId",
          itemName: { $first: "$itemName" },
          count: { $sum: 1 },
          totalLoss: { $sum: "$totalLossValue" },
          totalQuantity: { $sum: "$spoiledQuantity" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      totalLoss: totalLossResult[0]?.totalLoss || 0,
      spoilageByReason,
      spoilageByCategory,
      topSpoiledItems,
    });
  } catch (err) {
    console.error("Error getting spoilage analytics:", err);
    res.status(500).json({ message: "Server error" });
  }
};