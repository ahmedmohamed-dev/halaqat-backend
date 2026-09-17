const mongoose = require("mongoose");

const scheduleRequestSchema = new mongoose.Schema(
  {
    halaqa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Halaqa",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedDay: { type: String, required: true },
    requestedTime: { type: String, required: true },
    reason: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ScheduleRequest", scheduleRequestSchema);
