const IVMOrder = require("../models/IVMOrder");
const IvmItem = require('../models/Item');


const Vendor = require("../models/Vendor");
const Item = require("../models/Item");
const mongoose = require("mongoose");
const { startOfDay, startOfWeek, startOfMonth, endOfDay } = require("date-fns");

// Create an IVM Order
exports.createIVMOrder = async (req, res) => {
  try {
    const { orderType, vendorId, destination, items, expectedDeliveryDate } =
      req.body;
    const restaurantId = req.user?.restaurantId;
    console.log("restaurantId from token:", restaurantId);

    if (!restaurantId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: restaurantId missing" });
    }

    if (orderType === "purchaseOrder" && !vendorId) {
      return res
        .status(400)
        .json({ message: "Vendor is required for purchase orders" });
    }

    if (
      (orderType === "saleOrder" || orderType === "stockoutOrder") &&
      !destination
    ) {
      return res
        .status(400)
        .json({
          message: "Destination is required for sale or stockout orders",
        });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    for (const item of items) {
      if (!item.itemId || !item.name || !item.quantity || !item.price) {
        return res
          .status(400)
          .json({
            message: "Each item must have itemId, name, quantity, and price",
          });
      }
    }

    // Prepare items for the order - set stockout equal to quantity for stockout orders
    const orderItems = items.map((item) => {
      const itemData = {
        itemId: item.itemId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      };

      // Automatically set stockout = quantity for stockout orders
      if (orderType === "stockoutOrder") {
        itemData.stockout = item.quantity;
        itemData.stockin = 0; // Initialize stockin to 0
      }

      return itemData;
    });

    const newOrder = new IVMOrder({
      restaurantId,
      orderType,
      vendorId: vendorId || null,
      destination: destination || null,
      items: orderItems,
      expectedDeliveryDate,
    });

    const savedOrder = await newOrder.save();

    if (orderType === "purchaseOrder") {
      for (const item of items) {
        const existingItem = await Item.findById(item.itemId);
        if (!existingItem) {
          return res
            .status(404)
            .json({ message: `Item with ID ${item.itemId} not found` });
        }

        const newTotalQuantity = existingItem.quantity + item.quantity;
        const newTotalPurchaseValue =
          (existingItem.totalPurchaseValue || 0) + item.price * item.quantity;
        const newAvgPrice = parseFloat(
          (newTotalPurchaseValue / newTotalQuantity).toFixed(2)
        );

        await Item.findByIdAndUpdate(
          item.itemId,
          {
            $inc: { quantity: item.quantity },
            price: newAvgPrice,
            avgPrice: newAvgPrice,
            totalPurchaseValue: newTotalPurchaseValue,
          },
          { new: true }
        );
      }
    } else if (orderType === "saleOrder" || orderType === "stockoutOrder") {
      for (const item of items) {
        await Item.findByIdAndUpdate(
          item.itemId,
          { $inc: { quantity: -item.quantity } },
          { new: true }
        );
      }
    }

    const populatedOrder = await IVMOrder.findById(savedOrder._id)
      .populate("vendorId")
      .populate("items.itemId");

    res.status(201).json(populatedOrder);
  } catch (err) {
    console.error("Error creating IVM order:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all IVM Orders with filtering
exports.getAllIVMOrders = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    console.log("restaurantId from token:", restaurantId);

    if (!restaurantId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: restaurantId missing" });
    }

    const orders = await IVMOrder.find({ restaurantId })
      .populate("vendorId")
      .populate("items.itemId");

    console.log("Fetched orders count:", orders.length);
    res.json(orders);
  } catch (err) {
    console.error("Error fetching IVM orders:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get orders by type with search, filtering, and pagination
//const { startOfDay, endOfDay, startOfWeek, startOfMonth } = require('date-fns');

exports.getOrdersByType = async (req, res) => {
  try {
    const { orderType } = req.params;
    const {
      status,
      dateFilter,
      searchTerm,
      page,
      pageSize,
      startDate,
      endDate,
      dateField = "createdAt", // Default to createdAt if not specified
    } = req.query;

    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Missing restaurant ID in token" });
    }

    console.log("Received request for getOrdersByType");
    console.log("Params:", req.params);
    console.log("Query Params:", req.query);

    // Updated to include spoilageOrder
    if (
      ![
        "purchaseOrder",
        "saleOrder",
        "stockoutOrder",
        "spoilageOrder",
      ].includes(orderType)
    ) {
      console.log("Invalid order type:", orderType);
      return res.status(400).json({ message: "Invalid order type" });
    }

    // Create base filter
    const filter = { orderType, restaurantId };

    // Status filter - only apply for non-spoilage orders since spoilage orders don't use status
    if (
      status &&
      status.toLowerCase() !== "all" &&
      orderType !== "spoilageOrder"
    ) {
      filter.status = status;
    }

    // Date filtering
    if (dateFilter && dateFilter !== "all") {
      const today = startOfDay(new Date());
      const dateFieldToFilter = dateField;

      if (dateFilter === "custom" && startDate && endDate) {
        const start = startOfDay(new Date(startDate));
        const end = endOfDay(new Date(endDate));
        filter[dateFieldToFilter] = { $gte: start, $lte: end };
        console.log(
          `Custom date range applied: ${start} to ${end} on field ${dateFieldToFilter}`
        );
      } else {
        let rangeStart;
        switch (dateFilter) {
          case "today":
            rangeStart = today;
            break;
          case "this week":
            rangeStart = startOfWeek(today, { weekStartsOn: 1 });
            break;
          case "this month":
            rangeStart = startOfMonth(today);
            break;
        }
        if (rangeStart) {
          filter[dateFieldToFilter] = { $gte: rangeStart };
        }
      }
    }

    console.log("Filter before search:", JSON.stringify(filter));

    // Search functionality
    let searchQuery = {};
    if (searchTerm && searchTerm.trim() !== "") {
      const searchRegex = new RegExp(searchTerm.trim(), "i");

      // Different search fields based on order type
      if (orderType === "spoilageOrder") {
        // For spoilage orders, search in item names, reasons, and reportedBy
        const items = await Item.find({ name: searchRegex });
        const itemIds = items.map((i) => i._id);

        searchQuery = {
          $or: [
            { "items.name": searchRegex },
            { "items.reason": searchRegex },
            { "items.reportedBy": searchRegex },
            { "items.itemId": { $in: itemIds } },
            { notes: searchRegex },
          ],
        };
      } else {
        // For other order types, include vendor search
        const vendors = await Vendor.find({ name: searchRegex });
        const vendorIds = vendors.map((v) => v._id);

        const items = await Item.find({ name: searchRegex });
        const itemIds = items.map((i) => i._id);

        searchQuery = {
          $or: [
            { vendorId: { $in: vendorIds } },
            { "items.name": searchRegex },
            { status: searchRegex },
            { "items.itemId": { $in: itemIds } },
            { destination: searchRegex },
            { notes: searchRegex },
          ],
        };
      }

      console.log("Search query applied:", JSON.stringify(searchQuery));
    }

    const finalFilter =
      searchTerm && searchTerm.trim() !== ""
        ? { $and: [filter, searchQuery] }
        : filter;

    console.log("Final filter applied:", JSON.stringify(finalFilter));

    // Pagination
    const currentPage = parseInt(page) || 1;
    const itemsPerPage = parseInt(pageSize) || 10;
    const skip = (currentPage - 1) * itemsPerPage;

    const totalCount = await IVMOrder.countDocuments(finalFilter);
    const totalPages = Math.ceil(totalCount / itemsPerPage);

    // Build populate array based on order type
    let populateArray = ["items.itemId"];

    // Only populate vendorId for orders that have vendors
    if (orderType !== "spoilageOrder") {
      populateArray.push("vendorId");
    }

    // For spoilage orders, also populate category information
    if (orderType === "spoilageOrder") {
      populateArray.push("items.categoryId");
    }

    const orders = await IVMOrder.find(finalFilter)
      .populate(populateArray)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(itemsPerPage);

    res.json({
      orders,
      pagination: {
        currentPage,
        totalPages,
        totalCount,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    });
  } catch (err) {
    console.error("Error fetching orders by type:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Also update the purchase stats function to include search:
exports.getPurchaseOrderStats = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Missing restaurant ID in token" });
    }

    const { status, dateFilter, searchTerm } = req.query;
    const filter = { orderType: "purchaseOrder", restaurantId };

    if (status && status.toLowerCase() !== "all") {
      filter.status = status;
    }

    if (dateFilter && dateFilter !== "all") {
      const today = startOfDay(new Date());
      let startDate;
      switch (dateFilter) {
        case "today":
          startDate = today;
          break;
        case "this week":
          startDate = startOfWeek(today, { weekStartsOn: 1 });
          break;
        case "this month":
          startDate = startOfMonth(today);
          break;
      }
      if (startDate) filter.expectedDeliveryDate = { $gte: startDate };
    }

    let searchQuery = {};
    if (searchTerm && searchTerm.trim() !== "") {
      const searchRegex = new RegExp(searchTerm.trim(), "i");
      const vendors = await Vendor.find({ name: searchRegex });
      const vendorIds = vendors.map((v) => v._id);
      const items = await Item.find({ name: searchRegex });
      const itemIds = items.map((i) => i._id);

      searchQuery = {
        $or: [
          { vendorId: { $in: vendorIds } },
          { "items.name": searchRegex },
          { status: searchRegex },
          { "items.itemId": { $in: itemIds } },
        ],
      };
    }

    const finalFilter = searchTerm?.trim()
      ? { $and: [filter, searchQuery] }
      : filter;

    const purchaseOrders = await IVMOrder.find(finalFilter).populate(
      "items.itemId"
    );

    let totalItems = 0,
      totalAmount = 0;
    purchaseOrders.forEach((order) => {
      order.items.forEach((item) => {
        totalItems += item.quantity;
        totalAmount += item.price * item.quantity;
      });
    });

    res.json({
      orderCount: purchaseOrders.length,
      totalItems,
      totalAmount: +totalAmount.toFixed(2),
    });
  } catch (err) {
    console.error("Error fetching purchase order statistics:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get sale order statistics with filtering
exports.getSaleOrderStats = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Missing restaurant ID in token" });
    }

    const { status, dateFilter } = req.query;
    const filter = { orderType: "saleOrder", restaurantId };

    if (status && status.toLowerCase() !== "all") {
      filter.status = status;
    }

    if (dateFilter && dateFilter !== "all") {
      const today = startOfDay(new Date());
      let startDate;
      switch (dateFilter) {
        case "today":
          startDate = today;
          break;
        case "this week":
          startDate = startOfWeek(today, { weekStartsOn: 1 });
          break;
        case "this month":
          startDate = startOfMonth(today);
          break;
      }
      if (startDate) filter.expectedDeliveryDate = { $gte: startDate };
    }

    const saleOrders = await IVMOrder.find(filter).populate("items.itemId");

    let totalItems = 0,
      totalAmount = 0;
    saleOrders.forEach((order) => {
      order.items.forEach((item) => {
        totalItems += item.quantity;
        totalAmount += item.price * item.quantity;
      });
    });

    res.json({
      orderCount: saleOrders.length,
      totalItems,
      totalAmount: +totalAmount.toFixed(2),
    });
  } catch (err) {
    console.error("Error fetching sale order statistics:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get stockout order statistics with filtering
exports.getStockoutOrderStats = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Missing restaurant ID in token" });
    }

    const { status, dateFilter } = req.query;
    const filter = { orderType: "stockoutOrder", restaurantId };

    if (status && status.toLowerCase() !== "all") {
      filter.status = status;
    }

    if (dateFilter && dateFilter !== "all") {
      const today = startOfDay(new Date());
      let startDate;
      switch (dateFilter) {
        case "today":
          startDate = today;
          break;
        case "this week":
          startDate = startOfWeek(today, { weekStartsOn: 1 });
          break;
        case "this month":
          startDate = startOfMonth(today);
          break;
      }
      if (startDate) filter.expectedDeliveryDate = { $gte: startDate };
    }

    const stockoutOrders = await IVMOrder.find(filter).populate("items.itemId");

    let totalItems = 0,
      totalAmount = 0;
    stockoutOrders.forEach((order) => {
      order.items.forEach((item) => {
        totalItems += item.quantity;
        totalAmount += item.price * item.quantity;
      });
    });

    res.json({
      orderCount: stockoutOrders.length,
      totalItems,
      totalAmount: +totalAmount.toFixed(2),
    });
  } catch (err) {
    console.error("Error fetching stockout order statistics:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update IVM Order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["order successful", "in transit", "delivered"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedOrder = await IVMOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedOrder)
      return res.status(404).json({ message: "IVM order not found" });

    res.json(updatedOrder);
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get a single IVM Order by ID
exports.getIVMOrderById = async (req, res) => {
  try {
    const order = await IVMOrder.findById(req.params.id)
      .populate("vendorId")
      .populate("items.itemId");

    if (!order) return res.status(404).json({ message: "IVM order not found" });

    res.json(order);
  } catch (err) {
    console.error("Error fetching IVM order:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update an IVM Order
exports.updateIVMOrder = async (req, res) => {
  try {
    const {
      orderType,
      vendorId,
      destination,
      items,
      expectedDeliveryDate,
      status,
    } = req.body;

    // Find the existing order to compare item quantities
    const existingOrder = await IVMOrder.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ message: "IVM order not found" });
    }

    const updateData = {};
    if (orderType) updateData.orderType = orderType;
    if (vendorId) updateData.vendorId = vendorId;
    if (destination) updateData.destination = destination;
    if (expectedDeliveryDate)
      updateData.expectedDeliveryDate = expectedDeliveryDate;
    if (status) updateData.status = status;

    // Update order items and quantities
    if (items) {
      updateData.items = items;

      // Only adjust quantities for purchase orders
      if (existingOrder.orderType === "purchaseOrder") {
        // Revert previous quantities
        for (const existingItem of existingOrder.items) {
          await Item.findByIdAndUpdate(existingItem.itemId, {
            $inc: { quantity: -existingItem.quantity },
          });
        }

        // Add new quantities
        for (const item of items) {
          await Item.findByIdAndUpdate(
            item.itemId,
            { $inc: { quantity: item.quantity } },
            { new: true }
          );
        }
      }
    }

    const updatedOrder = await IVMOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json(updatedOrder);
  } catch (err) {
    console.error("Error updating IVM order:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete an IVM Order
exports.deleteIVMOrder = async (req, res) => {
  try {
    const deletedOrder = await IVMOrder.findByIdAndDelete(req.params.id);
    if (!deletedOrder)
      return res.status(404).json({ message: "IVM order not found" });

    res.json({ message: "IVM order deleted successfully" });
  } catch (err) {
    console.error("Error deleting IVM order:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getOrderCounts = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return res
        .status(400)
        .json({ message: "Missing restaurant ID in token" });
    }

    const filter = { restaurantId }; // shared base filter for all types

    const purchaseCount = await IVMOrder.countDocuments({
      ...filter,
      orderType: "purchaseOrder",
    });
    const saleCount = await IVMOrder.countDocuments({
      ...filter,
      orderType: "saleOrder",
    });
    const stockoutCount = await IVMOrder.countDocuments({
      ...filter,
      orderType: "stockoutOrder",
    });

    res.json({
      purchase: purchaseCount,
      sale: saleCount,
      stockout: stockoutCount,
    });
  } catch (error) {
    console.error("Error fetching order counts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getOrderValues = async (req, res) => {
  try {
    const orders = await IVMOrder.find();

    const orderValues = {
      purchaseOrder: 0,
      saleOrder: 0,
      stockoutOrder: 0,
    };

    orders.forEach((order) => {
      const totalOrderValue = order.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      if (order.orderType in orderValues) {
        orderValues[order.orderType] += totalOrderValue;
      }
    });

    res.json(orderValues);
  } catch (error) {
    res.status(500).json({ message: "Error calculating order values", error });
  }
};

// stock in


exports.updateStockoutItems = async function (req, res) {
  try {
    const { sourceOrderId, items, status } = req.body;

    if (!sourceOrderId || !items || !Array.isArray(items)) {
      return res.status(400).json({
        message: "Invalid payload: sourceOrderId and items are required.",
      });
    }

    const order = await IVMOrder.findById(sourceOrderId);
    if (!order) {
      return res.status(404).json({ message: "Stockout order not found." });
    }

    if (order.orderType !== "stockoutOrder") {
      return res.status(400).json({ message: "Provided order is not a stockoutOrder." });
    }

    for (const updateItem of items) {
      const item = order.items.find(
        (i) =>
          i._id.toString() === updateItem.itemId ||
          i.itemId?.toString() === updateItem.itemId
      );

      if (item) {
        // Update stockout/stockin values
        if (typeof updateItem.stockout === "number") item.stockout = updateItem.stockout;
        if (typeof updateItem.stockin === "number") item.stockin = updateItem.stockin;
        if (typeof updateItem.price === "number") item.price = updateItem.price;

        // Update corresponding item in IvmItem collection
        if (item.itemId) {
          const ivmItem = await IvmItem.findById(item.itemId);

          if (ivmItem && typeof updateItem.stockin === "number" && typeof updateItem.price === "number") {
            // Calculate new total purchase value and quantity
            const addedValue = updateItem.stockin * updateItem.price;

            ivmItem.quantity += updateItem.stockin;
            ivmItem.totalPurchaseValue += addedValue;

            // Update avgPrice (new total / new quantity)
            if (ivmItem.quantity > 0) {
              ivmItem.avgPrice = ivmItem.totalPurchaseValue / ivmItem.quantity;
            }

            await ivmItem.save();
          }
        }
      }
    }

    if (status) {
      order.status = status;
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);

  } catch (error) {
    console.error("Stockin update error:", error);
    res.status(500).json({ message: `Failed to update stockout items: ${error.message}` });
  }
};

