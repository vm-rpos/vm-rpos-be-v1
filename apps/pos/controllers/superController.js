const Super = require('../models/Super');

// Get a single Super by user ID
const getSuperByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const superUser = await Super.findOne({ user: userId })
      .populate({
        path: 'user',
        select: '-password -pin -tokens -__v -createdAt -updatedAt'
      })
      .populate({
        path: 'createdRestaurants',
        select: 'name location contact -_id'
      });

    if (!superUser) {
      return res.status(200).json([]); // Return empty array instead of 404
    }

    res.status(200).json(superUser);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all Super users
const getAllSupers = async (req, res) => {
  try {
    const supers = await Super.find()
      .populate({
        path: 'user',
        select: '-password -pin -tokens -__v -createdAt -updatedAt'
      })
      .populate({
        path: 'createdRestaurants',
        select: 'name location contact -_id'
      });

    res.status(200).json(supers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getSuperByUserId,
  getAllSupers,
};
