const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  registerValidation,
  loginValidation,
} = require("../validation/userValidation");

exports.registerUser = async (req, res) => {
  try {
    const { error } = registerValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      class: classLevel,
      rollNumber,
    } = req.body;

    const emailExists = await User.findOne({ email });
    if (emailExists)
      return res.status(400).json({ error: "Email already registered." });

    const phoneExists = await User.findOne({ phone });
    if (phoneExists)
      return res.status(400).json({ error: "Phone already registered." });

    const newUser = new User({
      name,
      email,
      password,
      role,
      phone,
      address,
      class: classLevel,
      rollNumber,
    });

    await newUser.save();
    res.json({ message: "User registered successfully." });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { error } = loginValidation.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error." });
  }
};
