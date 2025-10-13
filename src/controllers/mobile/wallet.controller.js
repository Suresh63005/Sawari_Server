const sequelize = require("../../config/db");
const { razorpayInstance } = require("../../config/razorpay");
const { sendPushNotification } = require("../../helper/sendPushNotification");
const Driver = require("../../models/driver.model");
const { getDriverById, updateDriverBalance } = require("../../services/driver.service");
const { wallet, createWalletReport,getWalletBalance } = require("../../services/wallet.service");
const crypto = require("crypto");
const {v4:uuidv4} = require("uuid");

// 10 wallet history

const walletHistory = async (req, res) => {
  const driver_id = req.driver?.id;
  if (!driver_id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    //geting all wallet history
    const history = await wallet(driver_id);
    return res.status(200).json({
      success: true,
      message: "Wallet history fetched successfully",
      data: history
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
  const { amount,} = req.body;

  if (!driver_id) return res.status(401).json({ message: "Unauthorized" });
  if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

  try {
    const options = {
      amount: amount * 100, // Razorpay expects paise
      currency: "INR",
      receipt: uuidv4(),
      notes: { driver_id }
    };

    const order = await razorpayInstance.orders.create(options);
    //optional generate signature test using postman

    const generated_signature = crypto.createHmac("sha256",process.env.KEY_SECRET).update(`${order.id}|pay_test123456`).digest("hex");

    return res.status(200).json({
      success: true,
      message: "Razorpay order created",
      data: order,
      generated_signature
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Razorpay order creation failed"
    });
  }
};

const verifyPayment = async (req, res) => {
  const driver_id = req.driver?.id;
  const { order_id, payment_id, signature, amount } = req.body;

  if (!driver_id) return res.status(401).json({ message: "Unauthorized" });
  if (!order_id || !payment_id || !signature || !amount) {
    return res.status(400).json({ message: "Missing required fields" });
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
    try {
      const driver = await getDriverById(driver_id);
      // const updatedBalance =
      //   parseFloat(driver.wallet_balance || 0) + parseFloat(amount);
      const previousBalance = parseFloat(driver.wallet_balance || 0);
      const newBalance = previousBalance + parseFloat(amount);

      await updateDriverBalance(driver_id, newBalance, t); // update driver balance afetr adding payment

      await createWalletReport(driver_id, amount, newBalance, order_id, t); //create wallet report

       // ✅ If wallet was negative and now positive, reset credit_ride_count
      if (previousBalance < 0 && newBalance >= 0) {
        await Driver.update(
          { credit_ride_count: 0 },
          { where: { id: driver_id }, transaction: t }
        );
        console.log(`✅ credit_ride_count reset for driver ${driver_id}`);
      }

      await t.commit(); 

      // Send push notification
      if (driver.one_signal_id) {
        const fullName =
          `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
          "Driver";
        await sendPushNotification(
          driver.one_signal_id,
          { en: "Wallet Updated" },
          {
            en: `Hi ${fullName}, ${amount} has been added to your wallet. New balance is ${newBalance.toFixed(2)}.`,
          }
        );
        console.log(
          `📢 Push notification sent to driver (${fullName}) for wallet update`
        );
      } else {
        console.warn(
          `⚠️ Driver with ID ${driver_id} has no OneSignal ID, skipping push notification`
        );
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified and wallet updated",
      });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  } catch (error) {
    await t.rollback();
    console.error("Payment verification error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const myWalletBalance = async(req,res)=>{
  const driver = req.driver?.id;
  if(!driver) return res.status(401).json({message:"Unauthorized"});
    try {
      const balance = await getWalletBalance(driver);
      return res.status(200).json({
        success: true,
        message: "Wallet balance fetched successfully",
        data: { balance }
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
  verifyPayment
};