const User = require("../model/user");
const bcrypt = require("bcrypt");
const Mailer = require("../utils/Mailer");
const config = require("../service/config");
const nodemailer = require("nodemailer");
exports.me = async function (req, res) {
  try {
    const id = res.locals._id;
    const user_ = await User.findOne({ _id: id });
    if (!user_) {
      res.status(401).json({ message: "Invalid session " });
    } else {
      res.status(200).json({ user_ });
    }
  } catch (err) {}
};
exports.signUp = async function (req, res) {
  try {
    const { emailId, username, password, mobileNo } = req.body;
    const user = await User.findOne({
      $or: [
        { emailId: emailId },
        { username: username.trim() },
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
        username: username.trim(),
        emailId: emailId,
        password: hashedpass,
        mobileNo: mobileNo,
      });
      await user_.save();

      // const token = user_.generateAuthToken();
      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: config.TRANSPORT_AUTH_USER,// generated ethereal user
          pass: config.TRANSPORT_AUTH_PASS, // generated ethereal password
        },
        tls: {
          rejectUnauthorized: false
      }
      });
      
      // send mail with defined transport object
      let info = await transporter.sendMail({
        from: `"Mob Chat"`,
          to: user_.emailId,
          subject: "Welcome to mobchat! Please find your otp below",
          text: `You're on your way! Let's confirm your email address.`,
          html: `<p>You otp is ${user_.verification.otp}</p>`,

      });
     // await Mailer.sendVerifyEmail(user_, user_.verification.otp);

      res
        .status(200)
        .json({ token: null, user_, message: "Sign Up Successfull" });
    }
  } catch (err) {
    res.status(400).json({ message: "Please try again later" });
  }
};

exports.SignIn = async function (req, res) {
  try {
    const { username, password } = req.body;
    const user_ = await User.findOne({ username: username.trim() });
    if (user_) {
      let valid = await bcrypt.compare(password, user_.password);

      if (valid) {
        if (user_.verified) {
          const token = await user_.generateAuthToken();
          res.status(200).json({ token, user_, message: "User logged in" });
        } else {
          let transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
              user: config.TRANSPORT_AUTH_USER,// generated ethereal user
              pass: config.TRANSPORT_AUTH_PASS, // generated ethereal password
            },
            tls: {
              rejectUnauthorized: false
          }
          });
          
          // send mail with defined transport object
          let info = await transporter.sendMail({
            from: `"Mob Chat"`,
              to: user_.emailId,
              subject: "Welcome to mobchat! Please find your otp below",
              text: `You're on your way! Let's confirm your email address.`,
              html: `<p>You otp is ${user_.verification.otp}</p>`,
    
          });
        //  await Mailer.sendVerifyEmail(user_, user_.verification.otp);

          res.status(200).json({
            token: null,
            user_,
            message: "Please verify your account",
          });
        }
      } else {
        res.status(401).json({ message: "Invalid password" });
      }
    } else {
      res.status(401).json({ message: "username does not exists" });
    }
  } catch (err) {}
};

exports.verifyUser = async function (req, res) {
  try {
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
  } catch (err) {}
};

exports.ResetPassToken = async function (req, res) {
  try {
    const { emailId } = req.body;
    const user = await User.findOne({ emailId: emailId });
    if (user) {
      const resetToken = await user.generateResetPasswordToken();
      // await Mailer.sendResetPassword(user, resetToken);
      let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: config.TRANSPORT_AUTH_USER,// generated ethereal user
          pass: config.TRANSPORT_AUTH_PASS, // generated ethereal password
        },
        tls: {
          rejectUnauthorized: false
      }
      });
      
      // send mail with defined transport object
      let info = await transporter.sendMail({
        from: `"Mob Chat"`,
        to: user.emailId,
        subject: "Password reset link",
        text: `You're on your way! Let's reset your password.`,
        html: `https://mobchat.netlify.app/reset-password?token=${resetToken}`,

        // from: '"Neighbours 👻" <foo@example.com>', // sender address
        // to: `${user_.emailId}`, // list of receivers
        // subject: "Otp from neighbours", // Subject line
        // text: "Hello world?", // plain text body
        // html: `<p>Your otp for neighbours login is ${user_.verification.otp}</p>`, // html body
      });

      res.status(200).json({ message: "Reset link sent" });
    } else {
      res.status(401).json({ message: "email does not exists" });
    }
  } catch (err) {console.log(err)}
};

exports.ResetTokenVerify = async function (req, res) {
  try {
    const resetToken = req.params.resetToken;
    const user = await User.findOne({ "resetPassword.token": resetToken });

    if (user) {
      if (Date.now() > user.resetPassword.expiresIn) {
        res.status(400).json({ message: "Reset Link Expired" });
        user.resetPassword = {};
        await user.save();
      } else {
        res.status(200).json({ status: true });
      }
    } else {
      res.status(401).json({ message: "Invalid Link" });
    }
  } catch (err) {}
};

exports.ResetPass = async function (req, res) {
  try {
    const { resetToken, password } = req.body;
    const user = await User.findOne({ "resetPassword.token": resetToken });
    if (user) {
      if (Date.now() > user.resetPassword.expiresIn) {
        res.status(400).json({ message: "Reset Link Expired" });
        user.ResetPassword = {};
        await user.save();
      } else {
        const hashedpass = await bcrypt.hash(password, 10);

        user.password = hashedpass;

        user.resetPassword = {};

        await user.save();
        res.status(200).json({ message: "Reset done" });
      }
    } else {
      res.status(401).json({ message: "Invalid Link" });
    }
  } catch (err) {}
};
