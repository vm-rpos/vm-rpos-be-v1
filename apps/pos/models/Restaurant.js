const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: String,
    location: {
      address: String,
      city: String,
      state: String,
      zip: String,
    },
    contact: {
      phone: String,
      email: String,
    },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    qrImage: {
      type: String, // You can store the image URL or a base64 string
      default: "",  // Optional: default to an empty string
    },
    billTracking: {
      currentYear: {
        type: Number,
        default: () => new Date().getFullYear(),
      },
      currentMonth: {
        type: Number,
        default: () => new Date().getMonth() + 1,
      },
      currentDate: {
        type: Number,
        default: () => new Date().getDate(),
      },
      dailyOrderCounter: {
        type: Number,
        default: 0,
      },
      lastResetDate: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true }
);

// Method to generate bill number
restaurantSchema.methods.generateBillNumber = function () {
  const now = new Date();
  const billTracking = this.billTracking;

  // Check if we need to reset the counter
  if (
    now.getFullYear() !== billTracking.currentYear ||
    now.getMonth() + 1 !== billTracking.currentMonth ||
    now.getDate() !== billTracking.currentDate
  ) {
    billTracking.dailyOrderCounter = 0;
    billTracking.currentYear = now.getFullYear();
    billTracking.currentMonth = now.getMonth() + 1;
    billTracking.currentDate = now.getDate();
  }

  // Increment counter
  billTracking.dailyOrderCounter++;

  // Generate bill number: YYMMDDOOOO (Year last 2 digits, Month, Date, Order Number)
  const billNumber = `${
    String(billTracking.currentYear).slice(-2)
  }${
    billTracking.currentMonth.toString().padStart(2, '0')
  }${
    billTracking.currentDate.toString().padStart(2, '0')
  }${
    billTracking.dailyOrderCounter.toString().padStart(4, '0')
  }`;

  return billNumber;
};

const Restaurant = mongoose.model("Restaurant", restaurantSchema);

module.exports = Restaurant;
