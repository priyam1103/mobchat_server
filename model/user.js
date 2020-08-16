const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const config = require("../service/config");
const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    emailId: {
      type: String,
      required: true,
      unique: true,
    },
    mobileNo: {
      type: String,
      required: true,
      unique: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verification: {
      otp: {
        type: String,
        default: () => Math.floor(100000 + Math.random() * 900000),
      },
    },
    resetPassword: {
      token: {
        type: String,
        default: null,
      },
      expireIn: {
        type: Date,
        default: null,
      },
    },
    socketId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

UserSchema.method("generateAuthToken", async function () {
  const user = this;
  const token = jwt.sign(
    { id: user._id, username: user.username },
    config.JWT_SECRET
  );
  return token;
});

UserSchema.method("generateResetPasswordToken", async function () {
  const user = this;
  user.resetPassword.token = crypto.randomBytes(20).toString("hex");
  user.resetPassword.expireIn = Date.now() + 60 * 60 * 1000;
  user.save();
  return user.resetPassword.token;
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
