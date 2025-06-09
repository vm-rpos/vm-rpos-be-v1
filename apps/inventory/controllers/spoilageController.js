const IVMOrder = require("../models/IVMOrder");
const IvmItem = require("../models/Item");
const IvmCategory = require("../models/Category");


// GET all spoilage records for a restaurant
exports.getAllSpoilageRecords = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;

    const spoilageOrders = await IVMOrder.find({
      restaurantId,
      orderType: "spoilageOrder"
    })
      .sort({ createdAt: -1 })
      
      .select("-restaurantId -status -updatedAt -__v"); // exclude these fields from the root document

    res.status(200).json({  data: spoilageOrders });
  } catch (error) {
    console.error("Error fetching spoilage records:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};



exports.createSpoilageRecord = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required" });
    }

    const detailedItems = [];

    for (const spoilItem of items) {
      const itemInDb = await IvmItem.findOne({
        _id: spoilItem.itemId,
        restaurantId,
      });

      if (!itemInDb) {
        return res.status(404).json({ message: `Item not found: ${spoilItem.itemId}` });
      }

      if (spoilItem.quantity > itemInDb.quantity) {
        return res.status(400).json({
          message: `Insufficient quantity for item ${itemInDb.name}. Available: ${itemInDb.quantity}, requested spoil: ${spoilItem.quantity}`
        });
      }

      detailedItems.push({
        itemId: itemInDb._id,
        name: itemInDb.name,
        price: itemInDb.price,
        quantity: spoilItem.quantity,
        categoryId: itemInDb.categoryId,
        restaurantId,
        reason: spoilItem.reason || undefined // Add reason if provided
      });
    }

    const spoilageOrder = new IVMOrder({
      restaurantId,
      orderType: "spoilageOrder",
      items: detailedItems,
    });

    await spoilageOrder.save();

    // Decrement inventory
    for (const spoilItem of items) {
      await IvmItem.findByIdAndUpdate(
        spoilItem.itemId,
        { $inc: { quantity: -spoilItem.quantity } }
      );
    }

    return res.status(201).json({ message: "Spoilage order created successfully", spoilageOrder });

  } catch (error) {
    console.error("Error creating spoilage order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
