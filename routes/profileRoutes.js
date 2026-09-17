const express = require("express");
const UserProfile = require("../models/UserProfile");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ user: req.user.userId });
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

router.put("/memorized-surahs", authMiddleware, async (req, res) => {
  try {
    const { surahIds } = req.body;
    const profile = await UserProfile.findOneAndUpdate(
      { user: req.user.userId },
      { memorizedSurahs: surahIds },
      { new: true, upsert: true },
    );
    res.json({ message: "Updated successfully", profile });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
