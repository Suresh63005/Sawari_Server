const razorpay = require("razorpay");

const razorpayInstance = new razorpay({
  key_id: process.env.KEY_ID,
  key_secret: process.env.KEY_SECRET,
});

module.exports = {
  razorpayInstance,
};
