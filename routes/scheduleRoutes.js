const express = require("express");
const ScheduleRequest = require("../models/ScheduleRequest");
const Halaqa = require("../models/Halaqa");
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// الطالب بيبعت طلب تغيير موعد
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can request schedule changes" });
    }
    const { halaqaId, requestedDay, requestedTime, reason } = req.body;

    const request = await ScheduleRequest.create({
      halaqa: halaqaId,
      student: req.user.userId,
      requestedDay,
      requestedTime,
      reason,
    });

    res
      .status(201)
      .json({ message: "Request submitted successfully", request });
  } catch (error) {
    console.error("Create schedule request error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// الشيخ بيشوف كل الطلبات بتاعة حلقته
router.get("/halaqa/:halaqaId", authMiddleware, async (req, res) => {
  try {
    const requests = await ScheduleRequest.find({ halaqa: req.params.halaqaId })
      .populate("student", "name phone")
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error) {
    console.error("Get schedule requests error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// الشيخ بيقبل أو يرفض
router.post("/:requestId/manage", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "sheikh") {
      return res
        .status(403)
        .json({ message: "Only sheikhs can manage requests" });
    }
    const { action } = req.body; // "accept" or "reject"
    const request = await ScheduleRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = action === "accept" ? "accepted" : "rejected";
    await request.save();

    if (action === "accept") {
      await Halaqa.findByIdAndUpdate(request.halaqa, {
        "schedule.day": request.requestedDay,
        "schedule.time": request.requestedTime,
      });
    }

    await Notification.create({
      halaqa: request.halaqa,
      recipient: request.student,
      title:
        action === "accept"
          ? "تم قبول طلب تغيير الموعد"
          : "تم رفض طلب تغيير الموعد",
      body:
        action === "accept"
          ? `الموعد الجديد: ${request.requestedDay} - ${request.requestedTime}`
          : "لم تتم الموافقة على الطلب، راجع الشيخ لمزيد من التفاصيل.",
      type: "schedule",
    });

    res.json({ message: "Request updated successfully", request });
  } catch (error) {
    console.error("Manage schedule request error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
