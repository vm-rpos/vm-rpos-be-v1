const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET="Kedhareswarmatha"

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "1h" });
};

// **User Signup**
exports.signup = async (req, res) => {
  try {
    const { firstname, lastname, phonenumber, email, password, restaurantId } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: "Email already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ firstname, lastname, phonenumber, email, password: hashedPassword, restaurantId });
    await newUser.save();

    res.json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// **User Login**
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
