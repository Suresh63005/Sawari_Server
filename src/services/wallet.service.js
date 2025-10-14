const WalletReports = require("../models/wallet-report.model");
const { v4: uuidv4 } = require("uuid");

const wallet = async (driver_id) => {
  return WalletReports.findAll({
    where: {
      driver_id: driver_id,
    },
    attributes: [
      "driver_id",
      "amount",
      "transaction_type",
      "transaction_date",
      "description",
      "status",
      "createdAt",
      "balance_after",
    ],
    order: [["createdAt", "DESC"]],
  });
};

const bulkCreateWalletTransactions = async (transactions) => {
  try {
    await WalletReports.bulkCreate(transactions);
  } catch (error) {
    console.error("Error while bulk creating wallet transactions:", error);
    throw new Error("Failed to process wallet transactions");
  }
};

const createWalletReport = async (
  driver_id,
  amount,
  newBalance,
  order_id,
  transaction = null
) => {
  try {
    const walletReport = await WalletReports.create(
      {
        id: uuidv4(),
        driver_id,
        transaction_type: "credit",
        amount: parseFloat(amount).toFixed(2), // Store amount in AED
        balance_after: parseFloat(newBalance).toFixed(2), // Store balance in AED
        transaction_date: new Date(),
        description: `Wallet top-up via Razorpay. Order: ${order_id}`,
        status: "completed",
      },
      { transaction }
    );

    console.log("Created WalletReports entry:", {
      driver_id,
      amount: walletReport.amount,
      balance_after: walletReport.balance_after,
      order_id,
    });

    return walletReport;
  } catch (error) {
    console.error("Wallet report creation failed:", error);
    throw new Error("Failed to create wallet report");
  }
};

// Fetch wallet balance
const getWalletBalance = async (driver_id) => {
  try {
    const walletEntry = await WalletReports.findOne({
      where: { driver_id },
      attributes: ["balance_after"],
      order: [["createdAt", "DESC"]],
    });

    const balance = walletEntry
      ? parseFloat(walletEntry.balance_after || 0).toFixed(2)
      : "0.00";
    console.log(
      `Fetched wallet balance for driver ${driver_id}: ${balance} AED`
    );
    return balance;
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    throw new Error("Failed to fetch wallet balance");
  }
};

module.exports = {
  wallet,
  bulkCreateWalletTransactions,
  getWalletBalance,
  createWalletReport,
};
