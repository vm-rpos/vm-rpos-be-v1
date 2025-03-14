// models/Table.js
const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  tableNumber: {
    type: Number,
    required: true,
    unique: true
  },
  hasOrders: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Table', TableSchema);