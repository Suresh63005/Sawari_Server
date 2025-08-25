const WalletReports = require("../models/wallet-report.model")
const {v4:uuidv4} = require("uuid")

const wallet = async (driver_id) => {
    return WalletReports.findAll({
        where: {
            driver_id: driver_id
        },
        attributes: ["driver_id", "amount", "transaction_date", "description", "status", "createdAt"],
        order: [['createdAt', 'DESC']]
    })
}

const bulkCreateWalletTransactions = async (transactions) => {
    try {
        await WalletReports.bulkCreate(transactions)
    } catch (error) {
        console.error("Error while bulk creating wallet transactions:", error);
        throw new Error("Failed to process wallet transactions");
    }
}


const createWalletReport = async (driver_id, amount, newBalance, order_id, transaction) => {
  try {
    await WalletReports.create({
      id: uuidv4(),
      driver_id,
      transaction_type: "credit",
      amount,
      balance_after: newBalance,
      transaction_date: new Date(),
      description: `Wallet top-up via Razorpay. Order: ${order_id}`,
      status: "completed"
    }, { transaction }); // Pass the Sequelize transaction
  } catch (error) {
    console.error("Wallet report creation failed:", error);
    throw new Error("Failed to create wallet report");
  }
};

module.exports = {
    wallet,
    bulkCreateWalletTransactions ,
    createWalletReport
}