const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  registerValidation,
  loginValidation,
} = require("../validation/userValidation");

exports.registerUser = async (req, res) => {
  try {
    // Validate with abortEarly: false to get all errors
    const { error } = registerValidation.validate(req.body, {
      abortEarly: false,
    });

    if (error) {
      const errors = {};
      error.details.forEach((err) => {
        const key = err.path[0];
        errors[key] = err.message;
      });

      return res.status(400).json({ errors });
    }

    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      class: classLevel,
      rollNumber,
      enrollmentDate,
      status,
    } = req.body;

    // Check for duplicate email
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        errors: {
          email: "Email already registered.",
        },
      });
    }

    // Check for duplicate phone
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(400).json({
        errors: {
          phone: "Phone already registered.",
        },
      });
    }

    const newUser = new User({
      name,
      email,
      password,
      role,
      phone,
      address,
      class: classLevel,
      rollNumber,
      enrollmentDate,
      status,
    });

    await newUser.save();

    res.json({ message: "User registered successfully." });
  } catch (err) {
    console.error("Registration error:", err);
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
      {
        userId: user._id,
        role: user.role,
        name: user.name,
      },
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
