const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const UserProfile = require("../models/UserProfile");
const { isValidPhoneForCountry } = require("../utils/countries");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

router.post("/register", async (req, res) => {
  try {
    const { name, phone, password, role, country } = req.body;

    if (!name || !phone || !password || !role) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanPhone || !password.trim()) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (!["student", "sheikh"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    if (!country || !isValidPhoneForCountry(country, cleanPhone)) {
      return res.status(400).json({
        message: "رقم الهاتف غير صحيح لهذه الدولة",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "كلمة المرور لازم تكون 6 أحرف على الأقل",
      });
    }

    const existingUser = await User.findOne({
      phone: cleanPhone,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Phone number is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: cleanName,
      phone: cleanPhone,
      password: hashedPassword,
      role,
    });

    /*
     * Create a profile for every account.
     * The profile is connected to the real User ID.
     */
    await UserProfile.create({
      user: user._id,
    });

    res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    /*
     * Handle MongoDB duplicate phone safely.
     */
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Phone number is already registered",
      });
    }

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        message: "Phone and password are required",
      });
    }

    const cleanPhone = phone.trim();

    const user = await User.findOne({
      phone: cleanPhone,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid phone or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid phone or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    /*
     * Make sure old accounts also have a profile.
     */
    await UserProfile.findOneAndUpdate(
      { user: user._id },
      {
        $setOnInsert: {
          user: user._id,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

module.exports = router;
