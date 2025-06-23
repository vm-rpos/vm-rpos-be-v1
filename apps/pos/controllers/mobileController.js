const Section = require("../models/Section");
const Table = require("../models/Table");

const getTablesBySectionId = async (req, res) => {
  try {
    const { sectionId } = req.params;

    // Validate sectionId
    if (!sectionId) {
      return res.status(400).json({ message: 'Section ID is required' });
    }

    // Find tables in the given section
    const tables = await Table.find({ sectionId })
      .select('name tableNumber hasOrders seats currentBillAmount waiter.name') // Only fetch required fields
      .lean(); // Optional: converts Mongoose docs to plain JS objects

    const formattedTables = tables.map(table => ({
      id:table._id, 
      name: table.name,
      seats:table.seats,
      tableNumber: table.tableNumber,
      hasOrders: table.hasOrders,
      waiterName: table.waiter?.name || 'No waiter',
      billingPrice: table.currentBillAmount || 0,
      charges:table.charges||[]
    }));

    res.status(200).json({ tables: formattedTables });
  } catch (error) {
    console.error('Error fetching tables by section ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getTablesBySectionId };
