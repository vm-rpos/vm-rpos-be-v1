const Section = require("../models/Section");
const Table = require("../models/Table");

// Get all sections for the user's restaurant
exports.getAllSections = async (req, res) => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: No restaurant assigned" });
    }

    const restaurantId = req.user.restaurantId;

    const sections = await Section.find({ restaurantId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(sections);
  } catch (err) {
    console.error("Error fetching sections:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get all sections with their tables and latest orders
exports.getSectionsWithTables = async (req, res) => {
  try {
    if (!req.user || !req.user.restaurantId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: No restaurant assigned" });
    }

    const restaurantId = req.user.restaurantId;

    // Get all sections of the restaurant
    const sections = await Section.find({ restaurantId })
      .sort({ createdAt: -1 })
      .lean();

    const responseData = [];

    for (const section of sections) {
      // Get all tables for this section (no need to populate waiterId as we have waiter object)
      const tables = await Table.find({
        sectionId: section._id,
        restaurantId,
      }).lean();

      const tableData = [];
      let occupiedTables = 0;
      const totalTables = tables.length;

      for (const table of tables) {
        // Use data directly from the table model including the waiter object
        const totalItems =
          table.currentOrderItems?.reduce(
            (sum, item) => sum + item.quantity,
            0
          ) || 0;

        // Count occupied tables (tables with orders)
        if (table.hasOrders) {
          occupiedTables++;
        }

        tableData.push({
          tableId: table._id,
          tableNumber: table.tableNumber,
          tableName: table.name,
          // Use the embedded waiter object directly instead of the populated waiterId
          waiter: table.waiter || null,
          seats: table.seats,
          billingPrice: table.currentBillAmount || 0,
          orderTime: table.firstOrderTime || null,
          totalItems,
          hasOrders: table.hasOrders,
        });
      }

      // Calculate occupancy percentage
      const occupancyPercentage = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

      responseData.push({
        sectionName: section.section,
        sectionId: section._id,
        totalTables,
        occupiedTables,
        occupancyPercentage,
        tables: tableData,
      });
    }

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Error fetching sections with tables:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.createSection = async (req, res) => {
  try {
    const { section, charges } = req.body;

    // Validate section name
    if (
      !section ||
      typeof section !== "string" ||
      section.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Section name is required and must be a non-empty string",
      });
    }

    // Check user authentication and restaurant assignment
    if (!req.user || !req.user.restaurantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: No restaurant assigned",
      });
    }

    // Check if section already exists for this restaurant
    const existingSection = await Section.findOne({
      section: section.trim(),
      restaurantId: req.user.restaurantId,
    });

    if (existingSection) {
      return res.status(409).json({
        success: false,
        message: "Section already exists for this restaurant",
      });
    }

    // Validate charges if provided
    if (charges && Array.isArray(charges)) {
      for (const charge of charges) {
        // Validate charge name
        if (
          !charge.name ||
          typeof charge.name !== "string" ||
          charge.name.trim().length === 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Each charge must have a valid name (non-empty string)",
          });
        }

        // Validate charge value
        if (
          charge.value === undefined ||
          typeof charge.value !== "number" ||
          charge.value < 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Each charge must have a valid value (number >= 0)",
          });
        }

        // Validate charge type if provided
        if (charge.type && !["percentage", "fixed"].includes(charge.type)) {
          return res.status(400).json({
            success: false,
            message: "Charge type must be either 'percentage' or 'fixed'",
          });
        }
      }

      // Check for duplicate charge names
      const chargeNames = charges.map((charge) =>
        charge.name.toLowerCase().trim()
      );
      const uniqueChargeNames = [...new Set(chargeNames)];

      if (chargeNames.length !== uniqueChargeNames.length) {
        return res.status(400).json({
          success: false,
          message: "Duplicate charge names are not allowed",
        });
      }
    }

    // Create new section
    const newSection = new Section({
      section: section.trim(),
      restaurantId: req.user.restaurantId,
      charges: charges || [],
    });

    const savedSection = await newSection.save();

    // Populate restaurant details if needed
    await savedSection.populate("restaurantId", "name");

    res.status(201).json({
      success: true,
      message: "Section created successfully",
      data: savedSection,
    });
  } catch (err) {
    console.error("Error creating section:", err);

    // Handle specific MongoDB errors
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Section already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get a single section by ID
exports.getSectionById = async (req, res) => {
  try {
    const section = await Section.findOne({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
      charges:req.charges
    });

    if (!section) return res.status(404).json({ message: "Section not found" });

    res.json(section);
  } catch (err) {
    console.error("Error fetching section:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const { section, charges } = req.body;
    const sectionId = req.params.id;

    // Validate ObjectId format
    if (!sectionId || !sectionId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID format",
      });
    }

    // Check user authentication and restaurant assignment
    if (!req.user || !req.user.restaurantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: No restaurant assigned",
      });
    }

    // Check if at least one field is provided for update
    if (!section && charges === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "At least one field (section or charges) must be provided for update",
      });
    }

    const updateData = {};

    // Validate and prepare section name update
    if (section !== undefined) {
      if (typeof section !== "string" || section.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Section name must be a non-empty string",
        });
      }

      // Check if section name already exists for this restaurant (excluding current section)
      const existingSection = await Section.findOne({
        section: section.trim(),
        restaurantId: req.user.restaurantId,
        _id: { $ne: sectionId },
      });

      if (existingSection) {
        return res.status(409).json({
          success: false,
          message: "Section name already exists for this restaurant",
        });
      }

      updateData.section = section.trim();
    }

    // Validate and prepare charges update
    if (charges !== undefined) {
      if (!Array.isArray(charges)) {
        return res.status(400).json({
          success: false,
          message: "Charges must be an array",
        });
      }

      // Validate charges if provided
      for (const charge of charges) {
        // Validate charge name
        if (
          !charge.name ||
          typeof charge.name !== "string" ||
          charge.name.trim().length === 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Each charge must have a valid name (non-empty string)",
          });
        }

        // Validate charge value
        if (
          charge.value === undefined ||
          typeof charge.value !== "number" ||
          charge.value < 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Each charge must have a valid value (number >= 0)",
          });
        }

        // Validate charge type if provided
        if (charge.type && !["percentage", "fixed"].includes(charge.type)) {
          return res.status(400).json({
            success: false,
            message: "Charge type must be either 'percentage' or 'fixed'",
          });
        }
      }

      // Check for duplicate charge names
      const chargeNames = charges.map((charge) =>
        charge.name.toLowerCase().trim()
      );
      const uniqueChargeNames = [...new Set(chargeNames)];

      if (chargeNames.length !== uniqueChargeNames.length) {
        return res.status(400).json({
          success: false,
          message: "Duplicate charge names are not allowed",
        });
      }

      updateData.charges = charges;
    }

    // Update the section
    const updatedSection = await Section.findOneAndUpdate(
      { _id: sectionId, restaurantId: req.user.restaurantId },
      updateData,
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    ).populate("restaurantId", "name");

    if (!updatedSection) {
      return res.status(404).json({
        success: false,
        message: "Section not found or you don't have permission to update it",
      });
    }

    res.status(200).json({
      success: true,
      message: "Section updated successfully",
      data: updatedSection,
    });
  } catch (err) {
    console.error("Error updating section:", err);

    // Handle specific MongoDB errors
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }

    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid section ID",
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Section name already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// Delete a section
exports.deleteSection = async (req, res) => {
  try {
    const deletedSection = await Section.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.user.restaurantId,
    });

    if (!deletedSection)
      return res.status(404).json({ message: "Section not found" });

    res.json({ message: "Section deleted successfully" });
  } catch (err) {
    console.error("Error deleting section:", err);
    res.status(500).json({ message: "Server error" });
  }
};
