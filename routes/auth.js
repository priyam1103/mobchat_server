const express = require("express");
const route = express.Router();
const {
  signUp,
  SignIn,
  verifyUser,
  ResetPass,
  ResetPassToken,
  ResetTokenVerify,
  me,
} = require("../handlers/auth");
const auth = require("../middleware/auth");
route.post("/signup", signUp);
route.post("/signin", SignIn);
route.post("/verify", verifyUser);
route.post("/resetPassToken", ResetPassToken);
route.get("/resetPassVerify/:resetToken", ResetTokenVerify);
route.post("/resetPassword", ResetPass);
route.get("/me", auth, me);

module.exports = route;
