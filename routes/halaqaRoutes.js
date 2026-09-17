const express = require("express");
const crypto = require("crypto");

const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Halaqa = require("../models/Halaqa");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "";

  for (let i = 0; i < 4; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }

  return code;
}

// ============================================================
// CREATE HALAQA
// Sheikh only
// ============================================================

router.post("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "sheikh") {
      return res.status(403).json({
        message: "Only sheikhs can create halaqas",
      });
    }

    const { name, day, time, telegramLink, isOnline } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Halaqa name is required",
      });
    }

    let code;

    while (true) {
      code = generateCode();

      const existingHalaqa = await Halaqa.findOne({ code });

      if (!existingHalaqa) {
        break;
      }
    }

    const halaqa = await Halaqa.create({
      name,
      code,
      sheikh: req.user.userId,
      schedule: {
        day: day || "",
        time: time || "",
      },
      telegramLink: telegramLink || "",
      isOnline: Boolean(isOnline),
    });

    const populatedHalaqa = await Halaqa.findById(halaqa._id)
      .populate("sheikh", "name phone role")
      .populate("students", "name phone role");

    res.status(201).json({
      message: "Halaqa created successfully",
      halaqa: populatedHalaqa,
    });
  } catch (error) {
    console.error("Create halaqa error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ============================================================
// JOIN HALAQA
// Student sends a join request
// ============================================================

router.post("/join", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({
        message: "Only students can join halaqas",
      });
    }

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        message: "Halaqa code is required",
      });
    }

    const halaqa = await Halaqa.findOne({
      code: code.toUpperCase().trim(),
    });

    if (!halaqa) {
      return res.status(404).json({
        message: "Halaqa not found",
      });
    }

    const alreadyMember = halaqa.students.some(
      (studentId) => studentId.toString() === req.user.userId,
    );

    if (alreadyMember) {
      return res.status(400).json({
        message: "You are already a member of this halaqa",
      });
    }

    const existingRequest = halaqa.joinRequests.find(
      (request) =>
        request.student &&
        request.student.toString() === req.user.userId &&
        request.status === "pending",
    );

    if (existingRequest) {
      return res.status(400).json({
        message: "You already have a pending join request",
      });
    }

    halaqa.joinRequests.push({
      student: req.user.userId,
      status: "pending",
      createdAt: new Date(),
    });

    await halaqa.save();

    const populatedHalaqa = await Halaqa.findById(halaqa._id)
      .populate("sheikh", "name phone role")
      .populate("students", "name phone role");

    res.status(201).json({
      message: "Join request submitted successfully",
      halaqa: populatedHalaqa,
    });
  } catch (error) {
    console.error("Join halaqa error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ============================================================
// GET MY HALAQAT
// Sheikh -> his halaqat
// Student -> halaqat he belongs to
// ============================================================

router.get("/", authMiddleware, async (req, res) => {
  try {
    let halaqat;

    if (req.user.role === "sheikh") {
      halaqat = await Halaqa.find({
        sheikh: req.user.userId,
      })
        .populate("students", "name phone role")
        .populate("sheikh", "name phone role");
    } else {
      halaqat = await Halaqa.find({
        students: req.user.userId,
      })
        .populate("sheikh", "name phone role")
        .populate("students", "name phone role");
    }

    res.json({
      halaqat,
    });
  } catch (error) {
    console.error("Get halaqat error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ============================================================
// GET STUDENT PROFILE
// Sheikh only
// ============================================================

router.get("/student/:studentId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "sheikh") {
      return res.status(403).json({
        message: "Only sheikhs can view student profiles",
      });
    }

    const { studentId } = req.params;

    const student = await User.findById(studentId).select(
      "name phone role createdAt",
    );

    if (!student || student.role !== "student") {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    const halaqat = await Halaqa.find({
      sheikh: req.user.userId,
      students: studentId,
    }).select("name code schedule assignment");

    if (halaqat.length === 0) {
      return res.status(403).json({
        message: "This student is not in your halaqas",
      });
    }

    res.json({
      student,
      halaqat,
    });
  } catch (error) {
    console.error("Get student profile error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ============================================================
// GET JOIN REQUESTS
// Sheikh only
// ============================================================

router.get("/requests/join", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "sheikh") {
      return res.status(403).json({
        message: "Only sheikhs can view join requests",
      });
    }

    const halaqat = await Halaqa.find({
      sheikh: req.user.userId,
      "joinRequests.status": "pending",
    }).populate("joinRequests.student", "name phone role");

    const requests = [];

    for (const halaqa of halaqat) {
      for (const request of halaqa.joinRequests || []) {
        if (request.status === "pending") {
          requests.push({
            id: request._id,
            halaqaId: halaqa._id,
            halaqaName: halaqa.name,
            code: halaqa.code,
            student: request.student,
            status: request.status,
            createdAt: request.createdAt,
          });
        }
      }
    }

    res.json({
      requests,
    });
  } catch (error) {
    console.error("Get join requests error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ============================================================
// ACCEPT / REJECT JOIN REQUEST
// Sheikh only
// ============================================================

router.post(
  "/requests/join/:halaqaId/:requestId",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "sheikh") {
        return res.status(403).json({
          message: "Only sheikhs can manage join requests",
        });
      }

      const { halaqaId, requestId } = req.params;
      const { action } = req.body;

      if (!["accept", "reject"].includes(action)) {
        return res.status(400).json({
          message: "Action must be accept or reject",
        });
      }

      const halaqa = await Halaqa.findOne({
        _id: halaqaId,
        sheikh: req.user.userId,
      });

      if (!halaqa) {
        return res.status(404).json({
          message: "Halaqa not found",
        });
      }

      const request = halaqa.joinRequests.id(requestId);

      if (!request) {
        return res.status(404).json({
          message: "Join request not found",
        });
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          message: "This request has already been processed",
        });
      }

      if (action === "accept") {
        const alreadyStudent = halaqa.students.some(
          (studentId) => studentId.toString() === request.student.toString(),
        );

        if (!alreadyStudent) {
          halaqa.students.push(request.student);
        }

        request.status = "accepted";
      } else {
        request.status = "rejected";
      }

      await halaqa.save();

      const updatedHalaqa = await Halaqa.findById(halaqa._id)
        .populate("sheikh", "name phone role")
        .populate("students", "name phone role");

      res.json({
        message:
          action === "accept"
            ? "Join request accepted successfully"
            : "Join request rejected successfully",
        halaqa: updatedHalaqa,
      });
    } catch (error) {
      console.error("Manage join request error:", error);

      res.status(500).json({
        message: "Something went wrong",
      });
    }
  },
);

// ============================================================
// UPDATE HALAQA ASSIGNMENT
// Sheikh only
// ============================================================

router.put("/:halaqaId/assignment", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "sheikh") {
      return res.status(403).json({
        message: "Only sheikhs can update halaqa assignments",
      });
    }

    const { halaqaId } = req.params;

    const {
      memorizationSurah,
      memorizationFrom,
      memorizationTo,
      memorizationType,
      revisionSurah,
      revisionWholeSurah,
      revisionFrom,
      revisionTo,
      revisionType,
      generalNotes,
    } = req.body;

    const halaqa = await Halaqa.findOne({
      _id: halaqaId,
      sheikh: req.user.userId,
    });

    if (!halaqa) {
      return res.status(404).json({
        message: "Halaqa not found",
      });
    }

    halaqa.assignment = {
      memorizationSurah:
        typeof memorizationSurah === "string" ? memorizationSurah.trim() : "",

      memorizationFrom:
        Number.isFinite(Number(memorizationFrom)) &&
        Number(memorizationFrom) >= 1
          ? Number(memorizationFrom)
          : 1,

      memorizationTo:
        Number.isFinite(Number(memorizationTo)) && Number(memorizationTo) >= 1
          ? Number(memorizationTo)
          : 1,

      revisionSurah:
        typeof revisionSurah === "string" ? revisionSurah.trim() : "",

      revisionWholeSurah: Boolean(revisionWholeSurah),

      revisionFrom:
        Number.isFinite(Number(revisionFrom)) && Number(revisionFrom) >= 1
          ? Number(revisionFrom)
          : 1,

      revisionTo:
        Number.isFinite(Number(revisionTo)) && Number(revisionTo) >= 1
          ? Number(revisionTo)
          : 1,

      generalNotes: typeof generalNotes === "string" ? generalNotes.trim() : "",
      memorizationType: ["surah", "juz", "pages"].includes(memorizationType)
        ? memorizationType
        : "surah",
      revisionType: ["surah", "juz", "pages"].includes(revisionType)
        ? revisionType
        : "surah",
    };

    await halaqa.save();

    const updatedHalaqa = await Halaqa.findById(halaqa._id)
      .populate("sheikh", "name phone role")
      .populate("students", "name phone role");

    res.json({
      message: "Halaqa assignment updated successfully",
      halaqa: updatedHalaqa,
    });
  } catch (error) {
    console.error("Update halaqa assignment error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ============================================================
// GET ONE HALAQA
// Sheikh -> his halaqa
// Student -> halaqa he belongs to
// ============================================================

router.get("/:halaqaId", authMiddleware, async (req, res) => {
  try {
    const { halaqaId } = req.params;

    let halaqa;

    if (req.user.role === "sheikh") {
      halaqa = await Halaqa.findOne({
        _id: halaqaId,
        sheikh: req.user.userId,
      })
        .populate("sheikh", "name phone role")
        .populate("students", "name phone role");
    } else {
      halaqa = await Halaqa.findOne({
        _id: halaqaId,
        students: req.user.userId,
      })
        .populate("sheikh", "name phone role")
        .populate("students", "name phone role");
    }

    if (!halaqa) {
      return res.status(404).json({
        message: "Halaqa not found",
      });
    }

    res.json({
      message: "Halaqa fetched successfully",
      halaqa,
    });
  } catch (error) {
    console.error("Get halaqa error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ============================================================
// RECORD ATTENDANCE
// Sheikh only
// ============================================================

router.post("/:halaqaId/attendance", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "sheikh") {
      return res.status(403).json({
        message: "Only sheikhs can record attendance",
      });
    }

    const { studentId, status, date } = req.body;
    const { halaqaId } = req.params;

    if (!studentId || !status) {
      return res.status(400).json({
        message: "studentId and status are required",
      });
    }

    if (!["present", "absent", "late"].includes(status)) {
      return res.status(400).json({
        message: "Invalid attendance status",
      });
    }

    const halaqa = await Halaqa.findOne({
      _id: halaqaId,
      sheikh: req.user.userId,
    });

    if (!halaqa) {
      return res.status(404).json({
        message: "Halaqa not found",
      });
    }

    if (!halaqa.students.some((student) => student.toString() === studentId)) {
      return res.status(400).json({
        message: "Student is not in this halaqa",
      });
    }

    const attendance = await Attendance.create({
      halaqa: halaqaId,
      student: studentId,
      status,
      date: date || new Date(),
    });

    res.status(201).json({
      message: "Attendance recorded successfully",
      attendance,
    });
  } catch (error) {
    console.error("Record attendance error:", error);

    res.status(500).json({
      message: "Something went wrong",
    });
  }
});

// ============================================================
// GET ATTENDANCE
// Sheikh -> any student in his halaqa
// Student -> his own attendance
// ============================================================

router.get(
  "/:halaqaId/student/:studentId/attendance",
  authMiddleware,
  async (req, res) => {
    try {
      const { halaqaId, studentId } = req.params;

      if (req.user.role === "sheikh") {
        const halaqa = await Halaqa.findOne({
          _id: halaqaId,
          sheikh: req.user.userId,
        });

        if (!halaqa) {
          return res.status(404).json({
            message: "Halaqa not found",
          });
        }

        if (
          !halaqa.students.some((student) => student.toString() === studentId)
        ) {
          return res.status(403).json({
            message: "Student is not in this halaqa",
          });
        }
      } else {
        const halaqa = await Halaqa.findOne({
          _id: halaqaId,
          students: req.user.userId,
        });

        if (!halaqa || studentId !== req.user.userId) {
          return res.status(403).json({
            message: "Access denied",
          });
        }
      }

      const attendance = await Attendance.find({
        halaqa: halaqaId,
        student: studentId,
      }).sort({ date: -1 });

      res.json({
        attendance,
      });
    } catch (error) {
      console.error("Get attendance error:", error);

      res.status(500).json({
        message: "Something went wrong",
      });
    }
  },
);
router.put("/:halaqaId/schedule", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "sheikh") {
      return res
        .status(403)
        .json({ message: "Only sheikhs can update schedule" });
    }
    const { halaqaId } = req.params;
    const { day, time } = req.body;

    const halaqa = await Halaqa.findOneAndUpdate(
      { _id: halaqaId, sheikh: req.user.userId },
      { "schedule.day": day, "schedule.time": time },
      { new: true },
    )
      .populate("sheikh", "name phone role")
      .populate("students", "name phone role");
    if (!halaqa) return res.status(404).json({ message: "Halaqa not found" });

    res.json({ message: "Schedule updated successfully", halaqa });
  } catch (error) {
    console.error("Update schedule error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
// الطالب يطلع من الحلقة
router.post("/:halaqaId/leave", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ message: "Only students can leave a halaqa" });
    }
    const halaqa = await Halaqa.findByIdAndUpdate(
      req.params.halaqaId,
      { $pull: { students: req.user.userId } },
      { new: true },
    );
    if (!halaqa) return res.status(404).json({ message: "Halaqa not found" });

    res.json({ message: "Left halaqa successfully" });
  } catch (error) {
    console.error("Leave halaqa error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// الشيخ يحذف حلقته
router.delete("/:halaqaId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "sheikh") {
      return res
        .status(403)
        .json({ message: "Only sheikhs can delete a halaqa" });
    }
    const halaqa = await Halaqa.findOneAndDelete({
      _id: req.params.halaqaId,
      sheikh: req.user.userId,
    });
    if (!halaqa) return res.status(404).json({ message: "Halaqa not found" });

    res.json({ message: "Halaqa deleted successfully" });
  } catch (error) {
    console.error("Delete halaqa error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
router.put("/:halaqaId/online", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "sheikh") {
      return res.status(403).json({ message: "Only sheikhs can update this" });
    }
    const { halaqaId } = req.params;
    const { telegramLink, isOnline } = req.body;

    const halaqa = await Halaqa.findOneAndUpdate(
      { _id: halaqaId, sheikh: req.user.userId },
      { telegramLink, isOnline },
      { new: true },
    )
      .populate("sheikh", "name phone role")
      .populate("students", "name phone role");

    if (!halaqa) return res.status(404).json({ message: "Halaqa not found" });

    res.json({ message: "Updated successfully", halaqa });
  } catch (error) {
    console.error("Update online info error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});
module.exports = router;
