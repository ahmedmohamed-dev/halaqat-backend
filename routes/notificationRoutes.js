const express = require("express");
const Notification = require("../models/Notification");
const Halaqa = require("../models/Halaqa");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// أي مستخدم بيجيب إشعاراته
router.get("/", authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.userId,
    }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// تعليم إشعار كمقروء
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
});

// الشيخ بيعمل إعلان لكل طلاب الحلقة
router.post("/announce", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "sheikh") {
      return res
        .status(403)
        .json({ message: "Only sheikhs can send announcements" });
    }
    const { halaqaId, title, body } = req.body;

    const halaqa = await Halaqa.findById(halaqaId);
    if (!halaqa) return res.status(404).json({ message: "Halaqa not found" });

    const notifications = await Notification.insertMany(
      halaqa.students.map((studentId) => ({
        halaqa: halaqaId,
        recipient: studentId,
        title,
        body,
        type: "announcement",
      })),
    );

    res
      .status(201)
      .json({
        message: "Announcement sent successfully",
        count: notifications.length,
      });
  } catch (error) {
    console.error("Send announcement error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
