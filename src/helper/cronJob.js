const cron = require("node-cron");
const { Op } = require("sequelize");
const Driver = require("../models/driver.model");
const Settings = require("../models/settings.model");
const { sendPushNotification } = require("./sendPushNotification");

/// Send Notification to driver when low balance in wallet
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running low wallet balance check...");

    // Fetch the settings to get min_wallet_percentage
    const settings = await Settings.findOne({
      attributes: ["min_wallet_percentage"],
    });

    if (!settings || settings.min_wallet_percentage == null) {
      console.error(
        "No settings found or min_wallet_percentage is not defined"
      );
      return;
    }

    const minWalletBalance = settings.min_wallet_percentage;

    // Find drivers with wallet balance below the threshold
    const drivers = await Driver.findAll({
      where: {
        wallet_balance: {
          [Op.lt]: minWalletBalance,
        },
        status: "active",
      },
    });

    // Send push notifications to drivers with low balances
    for (const driver of drivers) {
      if (driver.one_signal_id) {
        const heading = { en: "Low Wallet Balance Alert" };
        const message = {
          en: `Your wallet balance (${driver.wallet_balance.toFixed(2)}) is below the minimum required (${minWalletBalance.toFixed(2)}). Please add funds to your wallet.`,
        };
        try {
          await sendPushNotification(driver.one_signal_id, heading, message);
        } catch (error) {
          console.error(
            `Failed to send notification to driver ${driver.id}:`,
            error.message
          );
        }
      } else {
        console.warn(`⚠️ Driver with ID ${driver.id} has no OneSignal ID`);
      }
    }

    console.log(`Checked ${drivers.length} drivers for low wallet balance`);
  } catch (error) {
    console.error("Error checking low wallet balances:", error);
  }
});

/// Send Notifications to driver for scheduced rides
