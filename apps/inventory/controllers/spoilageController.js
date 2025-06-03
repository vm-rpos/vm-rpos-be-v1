const IVMOrder = require("../models/IVMOrder");
const Item = require("../models/Item");
const Category = require("../models/Category");

// Get all spoilage records for a restaurant
exports.getAllSpoilageRecords = async (req, res) => {
  try {
    const restaurantId = req.user.restaurantId;
    const { startDate, endDate, itemId, categoryId } = req.query;

    // Build filter for spoilage orders
    const filter = { 
      restaurantId,
      orderType: 'spoilageOrder'
    };

    // Item filter (search within items array)
    let matchStage = { $match: filter };
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    let pipeline = [matchStage];

    // If filtering by itemId or categoryId, we need to unwind and match items
    if (itemId || categoryId) {
      pipeline.push(
        { $unwind: "$items" },
        {
          $match: {
            ...(itemId && { "items.itemId": itemId }),
            ...(categoryId && { "items.categoryId": categoryId })
          }
        },
        {
          $group: {
            _id: "$_id",
            restaurantId: { $first: "$restaurantId" },
            orderType: { $first: "$orderType" },
            items: { $push: "$items" },
            createdAt: { $first: "$createdAt" },
            updatedAt: { $first: "$updatedAt" }
          }
        }
      );
    }

    pipeline.push(
      {
        $lookup: {
          from: "items",
          localField: "items.itemId",
          foreignField: "_id",
          as: "itemDetails"
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "items.categoryId",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      { $sort: { createdAt: -1 } }
    );

    const spoilageRecords = await IVMOrder.aggregate(pipeline);

    res.json(spoilageRecords);
  } catch (err) {
    console.error("Error getting spoilage records:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new spoilage record
exports.createSpoilageRecord = async (req, res) => {
  try {
    const { items, reportedBy } = req.body;

    const restaurantId = req.user.restaurantId;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Items array is required and cannot be empty",
      });
    }

    // Validate each item
    for (const item of items) {
      if (!item.itemId || !item.quantity || !item.reason) {
        return res.status(400).json({
          message: "Each item must have itemId, quantity, and reason",
        });
      }
    }

    // Process and validate items
    const processedItems = [];
    
    for (const item of items) {
      // Check item existence and restaurant ownership
      const dbItem = await Item.findOne({ _id: item.itemId, restaurantId });
      if (!dbItem) {
        return res.status(404).json({
          message: `Item ${item.itemId} not found or does not belong to your restaurant`,
        });
      }

      if (dbItem.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient quantity for item ${dbItem.name}. Available: ${dbItem.quantity}`,
        });
      }

      // Get category
      const category = await Category.findById(dbItem.categoryId);
      if (!category) {
        return res.status(404).json({ 
          message: `Category not found for item ${dbItem.name}` 
        });
      }

      processedItems.push({
        itemId: item.itemId,
        name: dbItem.name,
        quantity: item.quantity,
        price: dbItem.price,
        reason: item.reason,
        reportedBy: reportedBy || "",
        categoryId: dbItem.categoryId,
        totalLossValue: item.quantity * dbItem.price
      });

      // Reduce the item quantity
      await Item.findByIdAndUpdate(item.itemId, {
        $inc: { quantity: -item.quantity }
      });
    }

    // Create the spoilage record as IVMOrder
    const spoilageOrder = new IVMOrder({
      restaurantId,
      orderType: 'spoilageOrder',
      items: processedItems
    });

    await spoilageOrder.save();

    // Populate the spoilage record
    const populatedRecord = await IVMOrder.findById(spoilageOrder._id)
      .populate("items.itemId", "name price")
      .populate("items.categoryId", "name");

    res.status(201).json(populatedRecord);
  } catch (err) {
    console.error("Error creating spoilage record:", err);
    res.status(500).json({ message: "Server error" });
  }
};