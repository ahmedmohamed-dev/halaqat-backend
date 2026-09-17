const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    avatar: {
      type: String,
      default: "",
      trim: true,
    },

    memorizedJuz: {
      type: Number,
      default: 0,
      min: 0,
    },

    memorizedSurahs: {
      type: [Number],
      default: [],
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("UserProfile", userProfileSchema);
