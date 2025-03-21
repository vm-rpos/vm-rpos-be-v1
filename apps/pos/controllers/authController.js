const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET="Kedhareswarmatha"

const generateToken = (user) => {
    return jwt.sign(
      {
        userId: user._id,
        restaurantId: user.restaurantId, // Include restaurantId
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
  };
  

// **User Signup**
exports.signup = async (req, res) => {
  try {
    const { firstname, lastname, phonenumber, email, password, restaurantId, pin } = req.body;

    // Validate PIN (must be 4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: "PIN must be a 4-digit number" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(pin, 10); // Hash the PIN

    const newUser = new User({ firstname, lastname, phonenumber, email, password: hashedPassword, restaurantId, pin: hashedPin });
    await newUser.save();

    res.json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// **User Login**
// Fix the login function
exports.login = async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ error: "Invalid credentials" });
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });
      
      const token = generateToken(user); // Pass the entire user object
      
      // Return user data with the token
      res.json({ 
        token, 
        user: {
          _id: user._id,
          email: user.email,
          restaurantId: user.restaurantId,
          firstname: user.firstname,
          lastname: user.lastname
        } 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };