// ============================================================
// FILE: backend/models.js
// SAVE LOCATION: FUTURE_FS_02/backend/models.js
// ============================================================

const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^[+\d\s\-().]{7,20}$/, "Please enter a valid phone number"],
    },
    source: {
      type: String,
      required: [true, "Source is required"],
      enum: {
        values: ["Website", "Referral", "Social Media", "Email", "Cold Call", "Event", "Other"],
        message: "{VALUE} is not a valid source",
      },
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ["New", "Contacted", "Converted"],
        message: "{VALUE} is not a valid status",
      },
      default: "New",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      default: "",
    },
    followUpDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster search queries
leadSchema.index({ name: "text", email: "text", phone: "text" });
leadSchema.index({ status: 1 });
leadSchema.index({ createdAt: -1 });

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;