// ============================================================
// FILE: backend/routes.js
// SAVE LOCATION: FUTURE_FS_02/backend/routes.js
// ============================================================

const express = require("express");
const router = express.Router();
const Lead = require("./models");

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────

// POST /api/auth/login
router.post("/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required." });
  }

  // Hardcoded admin credentials (for internship demo; use JWT + hashed passwords in production)
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: { username: ADMIN_USERNAME, role: "admin" },
      token: "crm-demo-token-2024", // Static token for demo
    });
  }

  return res.status(401).json({ success: false, message: "Invalid username or password." });
});

// ─────────────────────────────────────────────
// LEADS ROUTES
// ─────────────────────────────────────────────

// GET /api/leads — Get all leads with optional search & filter
router.get("/leads", async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const query = {};

    // Status filter
    if (status && ["New", "Contacted", "Converted"].includes(status)) {
      query.status = status;
    }

    // Search filter (name, email, phone)
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { email: regex }, { phone: regex }, { source: regex }];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Lead.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: leads,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error fetching leads.", error: error.message });
  }
});

// GET /api/leads/stats — Dashboard statistics
router.get("/leads/stats", async (req, res) => {
  try {
    const [total, newLeads, contacted, converted] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({ status: "New" }),
      Lead.countDocuments({ status: "Contacted" }),
      Lead.countDocuments({ status: "Converted" }),
    ]);

    res.status(200).json({
      success: true,
      data: { total, new: newLeads, contacted, converted },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error fetching stats.", error: error.message });
  }
});

// GET /api/leads/:id — Get single lead
router.get("/leads/:id", async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found." });
    res.status(200).json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error fetching lead.", error: error.message });
  }
});

// POST /api/leads — Create new lead
router.post("/leads", async (req, res) => {
  try {
    const { name, email, phone, source, status, notes, followUpDate } = req.body;

    const existingLead = await Lead.findOne({ email: email?.toLowerCase().trim() });
    if (existingLead) {
      return res.status(409).json({ success: false, message: "A lead with this email already exists." });
    }

    const lead = new Lead({ name, email, phone, source, status, notes, followUpDate });
    await lead.save();

    res.status(201).json({ success: true, message: "Lead created successfully.", data: lead });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({ success: false, message: "Server error creating lead.", error: error.message });
  }
});

// PUT /api/leads/:id — Update lead
router.put("/leads/:id", async (req, res) => {
  try {
    const { name, email, phone, source, status, notes, followUpDate } = req.body;

    // Check duplicate email (excluding current lead)
    if (email) {
      const existing = await Lead.findOne({ email: email.toLowerCase().trim(), _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({ success: false, message: "Another lead with this email already exists." });
      }
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, source, status, notes, followUpDate },
      { new: true, runValidators: true }
    );

    if (!lead) return res.status(404).json({ success: false, message: "Lead not found." });

    res.status(200).json({ success: true, message: "Lead updated successfully.", data: lead });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({ success: false, message: "Server error updating lead.", error: error.message });
  }
});

// DELETE /api/leads/:id — Delete lead
router.delete("/leads/:id", async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found." });
    res.status(200).json({ success: true, message: "Lead deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error deleting lead.", error: error.message });
  }
});

module.exports = router;