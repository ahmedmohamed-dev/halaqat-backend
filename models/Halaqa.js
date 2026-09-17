const mongoose = require("mongoose");

const halaqaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    sheikh: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    joinRequests: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    schedule: {
      day: {
        type: String,
        default: "",
      },

      time: {
        type: String,
        default: "",
      },
    },

    // ============================================================
    // Quran Assignment
    // ============================================================

    assignment: {
      memorizationSurah: {
        type: String,
        default: "",
        trim: true,
      },

      memorizationFrom: {
        type: Number,
        default: 1,
        min: 1,
      },

      memorizationTo: {
        type: Number,
        default: 1,
        min: 1,
      },

      // نوع الحفظ: سورة / جزء / صفحات
      memorizationType: {
        type: String,
        enum: ["surah", "juz", "pages"],
        default: "surah",
      },

      revisionSurah: {
        type: String,
        default: "",
        trim: true,
      },

      revisionWholeSurah: {
        type: Boolean,
        default: false,
      },

      revisionFrom: {
        type: Number,
        default: 1,
        min: 1,
      },

      revisionTo: {
        type: Number,
        default: 1,
        min: 1,
      },

      // نوع المراجعة: سورة / جزء / صفحات
      revisionType: {
        type: String,
        enum: ["surah", "juz", "pages"],
        default: "surah",
      },

      generalNotes: {
        type: String,
        default: "",
        trim: true,
      },
    },

    telegramLink: {
      type: String,
      default: "",
      trim: true,
    },

    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Halaqa", halaqaSchema);
