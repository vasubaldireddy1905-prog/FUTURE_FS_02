// ============================================================
// FILE: backend/server.js
// SAVE LOCATION: FUTURE_FS_02/backend/server.js
// ============================================================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const routes = require("./routes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/crm_db";

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger (dev)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────
app.use("/api", routes);

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "OK", message: "CRM API is running 🚀", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error.", error: err.message });
});

// ─────────────────────────────────────────────
// DATABASE + SERVER START
// ─────────────────────────────────────────────
mongoose.connect(MONGO_URI)
.then(() => {
    console.log("✅ MongoDB connected successfully");

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📘 API available at http://localhost:${PORT}/api`);
    });
})
.catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
});