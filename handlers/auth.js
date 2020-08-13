const User = require("../model/user");
const bcrypt = require("bcrypt");
const Mailer = require("../utils/Mailer");

exports.me = async function (req, res) {
  const id = res.locals._id;
  const user_ = await User.findOne({ _id: id });
  if (!user_) {
    res.status(401).json({ message: "Invalid session " });
  } else {
    res.status(200).json({ user_ });
  }
};
exports.signUp = async function (req, res) {
  try {
    console.log(req.body);
    const { emailId, username, password, mobileNo } = req.body;
    const user = await User.findOne({
      $or: [
        { emailId: emailId },
        { username: username },
        { mobileNo: mobileNo },
      ],
    });
    if (user)
      res.status(401).json({
        username: user.username,
        emailId: user.emailId,
        mobileNo: user.mobileNo,
      });
    else {
      let hashedpass = await bcrypt.hash(password, 10);
      const user_ = new User({
        username: username,
        emailId: emailId,
        password: hashedpass,
        mobileNo: mobileNo,
      });
      await user_.save();
      console.log(user_);
      // const token = user_.generateAuthToken();
      await Mailer.sendVerifyEmail(user_, user_.verification.otp);

      res.status(200).json({ user_, message: "Sign Up Successfull" });
    }
  } catch (err) {
    res.status(400).json({ message: "Please try again later" });
  }
};

exports.SignIn = async function (req, res) {
  const { username, password } = req.body;
  console.log(username);
  const user_ = await User.findOne({ username: username });
  console.log(user_);
  if (user_) {
    let valid = bcrypt.compare(password, user_.password);

    if (valid) {
      if (user_.verified) {
        const token = await user_.generateAuthToken();
        res.status(200).json({ token, user_, message: "User logged in" });
      } else {
        await Mailer.sendVerifyEmail(user_, user_.verification.otp);

        res.status(200).json({ user_, message: "Please verify your account" });
      }
    } else {
      res.status(401).json({ message: "Invalid password" });
    }
  } else {
    res.status(401).json({ message: "username does not exists" });
  }
};

exports.verifyUser = async function (req, res) {
  const { otp, emailId } = req.body;
  const user_ = await User.findOne({ emailId: emailId });
  if (user_) {
    if (user_.verified) {
      res.status(401).json({ message: "user already verified" });
    }
    if (user_.verification.otp == otp) {
      user_.verified = true;
      user_.verification = {};
      await user_.save();
      const token = await user_.generateAuthToken();
      res.status(200).json({ token, user_, message: "User verified" });
    } else {
      res.status(401).json({ message: "Invalid otp" });
    }
  } else {
    res.status(400).json({ message: "user does not exists" });
  }
};

exports.ResetPassToken = async function (req, res) {
  const { emailId } = req.body;
  const user = await User.findOne({ emailId: emailId });
  if (user) {
    const resetToken = user.generateResetPasswordToken();

    res.status(200).json({ resetToken, message: "Reset link sent" });
  } else {
    res.status(401).json({ message: "username does not exists" });
  }
};

exports.ResetTokenVerify = async function (req, res) {
  const { resetToken } = req.body;
  const user = await User.findOne({ "resetPassword.token": resetToken });
  if (user) {
    if (Date.now() > user.ResetPassword.expiresIn) {
      res.status(400).json({ message: "Reset Link Expired" });
      user.ResetPassword = {};
      await user.save();
    } else {
      res.status(200).json({ status: true });
    }
  } else {
    res.status(401).json({ message: "Invalid Link" });
  }
};

exports.ResetPass = async function (req, res) {
  const { resetToken, password } = req.body;
  const user = await User.findOne({ "resetPassword.token": resetToken });
  if (user) {
    if (Date.now() > user.ResetPassword.expiresIn) {
      res.status(400).json({ message: "Reset Link Expired" });
      user.ResetPassword = {};
      await user.save();
    } else {
      const hashedpass = await bcrypt.hash(password, 10);
      user.password = hashedpass;
      user.ResetPassword = {};
      await user.save();
    }
  } else {
    res.status(401).json({ message: "Invalid Link" });
  }
};
