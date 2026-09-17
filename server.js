require("dotenv").config();
const authMiddleware = require("./middleware/authMiddleware");

const express = require("express");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const halaqaRoutes = require("./routes/halaqaRoutes");

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/schedule-requests", require("./routes/scheduleRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/auth", authRoutes);
app.use("/api/halaqat", halaqaRoutes);
app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    message: "You are authenticated ✅",
    user: req.user,
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Halaqat Backend is running 🚀",
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully ✅");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed ❌");
    console.error(error.message);
  });
