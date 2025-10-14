const sequelize = require("../../config/db");
const { razorpayInstance } = require("../../config/razorpay");
const {
  getDriverById,
  updateDriverBalance,
} = require("../../services/driver.service");
const {
  wallet,
  createWalletReport,
  getWalletBalance,
} = require("../../services/wallet.service");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

// 10 wallet history

const walletHistory = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    //geting all wallet history
    const history = await wallet(driver_id);
    return res.status(200).json({
      success: true,
      message: "Wallet history fetched successfully",
      data: history,
    });
  } catch (error) {
    console.error("Error fetching wallet history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet history",
    });
  }
};

// 11) add money to wallet
const addMoneyToWallet = async (req, res) => {
  const driver_id = req.driver?.id;
  const { amount } = req.body;

  if (!driver_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!amount || amount <= 0)
    return res.status(400).json({ success: false, message: "Invalid amount" });

  try {
    const options = {
      amount: amount * 100, // Razorpay expects paise
      currency: "INR",
      receipt: uuidv4(),
      notes: { driver_id },
    };

    const order = await razorpayInstance.orders.create(options);
    //optional generate signature test using postman

    const generated_signature = crypto
      .createHmac("sha256", process.env.KEY_SECRET)
      .update(`${order.id}|pay_test123456`)
      .digest("hex");

    return res.status(200).json({
      success: true,
      message: "Razorpay order created",
      data: order,
      generated_signature,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Razorpay order creation failed",
    });
  }
};

const verifyPayment = async (req, res) => {
  const driver_id = req.driver?.id;
  const { order_id, payment_id, signature, amount } = req.body;

  if (!driver_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });
  if (!order_id || !payment_id || !signature || !amount) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  let t;
  try {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.KEY_SECRET)
      .update(order_id + "|" + payment_id)
      .digest("hex");

    if (generatedSignature !== signature) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid signature" });
    }
    t = await sequelize.transaction();
    const driver = await getDriverById(driver_id);
    const updatedBalance =
      parseFloat(driver.wallet_balance || 0) + parseFloat(amount);

    await updateDriverBalance(driver_id, updatedBalance); // update driver balance afetr adding payment

    await createWalletReport(driver_id, amount, updatedBalance, order_id, t); //create wallet report
    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Payment verified and wallet updated",
    });
  } catch (error) {
    await t.rollback();
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const myWalletBalance = async (req, res) => {
  const driver = req.driver?.id;
  if (!driver)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    const balance = await getWalletBalance(driver);
    return res.status(200).json({
      success: true,
      message: "Wallet balance fetched successfully",
      data: { balance },
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wallet balance",
    });
  }
};

module.exports = {
  walletHistory,
  addMoneyToWallet,
  myWalletBalance,
  verifyPayment,
};
