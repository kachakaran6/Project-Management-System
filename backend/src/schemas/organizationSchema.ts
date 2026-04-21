import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: {type: String, required: true, trim: true},
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    logoUrl: {type: String},
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {type: Boolean, default: true},
    isDefault: {type: Boolean, default: false},
    meta: {
      description: {type: String},
      industry: {type: String},
      size: {type: String},
    },
  },
  {
    timestamps: true,
  },
);

export default organizationSchema;
