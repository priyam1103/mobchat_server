// const handlebars = require("handlebars");
// const fs = require("fs");
const nodemailer = require("nodemailer");
// const path = require("path");

const { config } = require("../service/config");

class Mailer {
  constructor() {
    this._createTransport();
    // this._compileTemplates();
  }

  _createTransport() {
    // if (config.DEV_ENV) {
    nodemailer.createTestAccount().then((account) => {
      this.transport = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
          user: account.user,
          pass: account.pass,
        },
      });
      this.user = account.user;
    });
  }
  //     } else {
  //       this.transport = nodemailer.createTransport({
  //         host: config.TRANSPORT.HOST,
  //         port: config.TRANSPORT.PORT,
  //         secure: config.TRANSPORT.PORT === 465,
  //         auth: {
  //           user: config.TRANSPORT.AUTH.USER,
  //           pass: config.TRANSPORT.AUTH.PASS,
  //         },
  //       });
  //       this.user = config.TRANSPORT.AUTH.USER;
  //     }
  //   }

  async _getTestAccount() {
    const testAccount = await nodemailer.createTestAccount();
    return testAccount;
  }

  //   _compileTemplates() {
  //     this.verifyEmail = handlebars.compile(
  //       fs
  //         .readFileSync(
  //           path.resolve(__dirname, "..", "templates", "verify_email.handlebars")
  //         )
  //         .toString()
  //     );
  //   }

  /**
   *
   * @param {Object} user
   * @param {string} user.fullName
   * @param {string} user.email
   * @param {string} token
   */
  sendVerifyEmail(user, otp) {
    return new Promise((resolve, reject) => {
      this.transport
        .sendMail({
          from: `"Mob Chat" <${this.user}>`,
          to: user.emailId,
          subject: "Welcome to bolo! Confirm Your Email",
          text: `You're on your way! Let's confirm your email address.`,
          html: `<p>${otp}</p>`,
        })
        .then((info) => {
          //   if (config.DEV_ENV) {
          const testEmailURL = nodemailer.getTestMessageUrl(info);
          console.log(`Test email URL: ${testEmailURL}`);
          //   }
          resolve();
          return;
        })
        .catch(() => {
          reject(new Error("Unable to send email at the moment."));
          return;
        });
    });
  }
  /**
   *
   * @param {Object} user
   * @param {string} user.fullName
   * @param {string} user.email
   * @param {string} token
   */
  sendResetPassword(user, token) {
    return new Promise((resolve, reject) => {
      this.transport
        .sendMail({
          from: `"Mob Chat" <${this.user}>`,
          to: user.emailId,
          subject: "Password reset link",
          text: `You're on your way! Let's reset your password.`,
          html: `${config.ALLOWED_URL}/reset-password?token=${token}`,
        })
        .then((info) => {
          //if (config.DEV_ENV) {
          const testEmailURL = nodemailer.getTestMessageUrl(info);
          console.log(`Test email URL: ${testEmailURL}`);
          //  }
          resolve();
          return;
        })
        .catch(() => {
          reject(new Error("Unable to send email at the moment."));
          return;
        });
    });
  }
}

module.exports = new Mailer();
