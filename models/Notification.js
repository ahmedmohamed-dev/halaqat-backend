const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    halaqa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Halaqa",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    type: {
      type: String,
      enum: ["announcement", "schedule", "system"],
      default: "system",
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", notificationSchema);
