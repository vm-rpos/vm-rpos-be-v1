const Group = require("../models/Group");
const Section = require("../models/Section");
const Waiter = require("../models/Waiter");
const Table = require("../models/Table");
const mongoose = require("mongoose");

const getTableById = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid table ID");
    }

    const table = await Table.findById(id);
    if (!table) {
      return { success: false, message: "Table not found" };
    }

    return {
      success: true,
      data: {
        _id: table._id,
        name: table.name,
        tableNumber: table.tableNumber,
        seats: table.seats,
        hasOrders: table.hasOrders,
        waiter: table.waiter, // includes embedded waiter object if present
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
      },
    };
  } catch (err) {
    console.error("Error in getTableById:", err);
    return { success: false, message: "Server error", error: err.message };
  }
};

const getWaiterById = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { success: false, message: "Invalid waiter ID" };
    }

    const waiter = await Waiter.findById(id);
    if (!waiter) {
      return { success: false, message: "Waiter not found" };
    }

    return {
      success: true,
      data: {
        _id: waiter._id,
        name: waiter.name,
        age: waiter.age,
        phoneNumber: waiter.phoneNumber,
        restaurantId: waiter.restaurantId,
        createdAt: waiter.createdAt,
        updatedAt: waiter.updatedAt,
      },
    };
  } catch (err) {
    console.error("Error in getWaiterById:", err);
    return { success: false, message: "Server error", error: err.message };
  }
};

const createGroup = async (req, res) => {
  try {
    const { name, sectionId } = req.body;
    // Check user authentication and restaurant assignment
    if (!req.user || !req.user.restaurantId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: No restaurant assigned",
      });
    }

    // Validate Section existence
    const sectionExists = await Section.findById(sectionId);
    if (!sectionExists) {
      return res.status(404).json({ error: "Section not found" });
    }

    // Create new Group
    const newGroup = new Group({
      name,
      sectionId,
      restaurantId: req.user.restaurantId,
    });
    await newGroup.save();

    res.status(201).json(newGroup);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

const addWaiterToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { waiterId } = req.body;

    // Validate Group existence
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Validate Waiter existence
    const waiterExists = await Waiter.findById(waiterId);
    if (!waiterExists) {
      return res.status(404).json({ error: "Waiter not found" });
    }

    // Update Group with waiterId
    group.waiterId = waiterId;
    await group.save();

    res.status(200).json({ message: "Waiter assigned successfully", group });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

const manageTables = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { tableIds } = req.body;

    // Validate Group existence
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Update Group with table references
    group.tableIds = tableIds;
    await group.save();

    res.status(200).json({ message: "Tables assigned successfully", group });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

const getGroupsBySection = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // Check if section exists
    const sectionExists = await Section.findById(sectionId);
    if (!sectionExists) {
      return res.status(404).json({ error: "Section not found" });
    }

    // Find groups for this section
    const groups = await Group.find({ sectionId });

    // Enrich each group with table and waiter info
    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        // Fetch tables
        const tables = await Promise.all(
          group.tableIds.map(async (tableId) => {
            const result = await getTableById(tableId);
            return result.success ? result.data : null;
          })
        );

        // Fetch waiter (if present)
        let waiter = null;
        if (group.waiterId) {
          const waiterResult = await getWaiterById(group.waiterId);
          waiter = waiterResult.success ? waiterResult.data : null;
        }

        return {
          ...group.toObject(),
          tables: tables.filter(Boolean),
          waiter, // includes waiter object or null
          tableIds: undefined, // optionally remove
          waiterId: undefined, // optionally remove
        };
      })
    );

    res.status(200).json({
      section: sectionExists.section,
      groups: enrichedGroups,
    });
  } catch (error) {
    console.error("Error in getGroupsBySection:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
const getAllSectionsWithGroups = async (req, res) => {
  try {
    // Fetch all sections
    const sections = await Section.find({ restaurantId: req.user.restaurantId });

    // Enrich each section with groups, tables, and waiters
    const enrichedSections = await Promise.all(
      sections.map(async (section) => {
        // Find groups belonging to this section
        const groups = await Group.find({ sectionId: section._id });

        const enrichedGroups = await Promise.all(
          groups.map(async (group) => {
            // Fetch tables
            const tables = await Promise.all(
              group.tableIds.map(async (tableId) => {
                const result = await getTableById(tableId);
                return result.success ? result.data : null;
              })
            );

            // Fetch waiter (if present)
            let waiter = null;
            if (group.waiterId) {
              const waiterResult = await getWaiterById(group.waiterId);
              waiter = waiterResult.success ? waiterResult.data : null;
            }

            return {
              ...group.toObject(),
              tables: tables.filter(Boolean),
              waiter,
              tableIds: undefined,
              waiterId: undefined,
            };
          })
        );

        return {
          ...section.toObject(),
          groups: enrichedGroups,
        };
      })
    );

    res.status(200).json({
      sections: enrichedSections,
    });
  } catch (error) {
    console.error("Error in getAllSectionsWithGroups:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  createGroup,
  getGroupsBySection,
  addWaiterToGroup,
  manageTables,
  getAllSectionsWithGroups, 
};
