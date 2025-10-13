const { sendPushNotification } = require("../../helper/sendPushNotification");
const driverService = require("../../services/driver.service");

exports.getAllDrivers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "" } = req.query;
    const data = await driverService.getAllDrivers(
      Number(page),
      Number(limit),
      search,
      status
    );
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDriverById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "Driver ID is required" });
    }
    const driver = await driverService.getDriverById(id);
    res.status(200).json(driver);
  } catch (error) {
    console.error("Error in getDriverById:", error.message);

    const statusCode = error.message === "Driver not found" ? 404 : 500;
    res
      .status(statusCode)
      .json({ message: error.message || "Failed to fetch driver" });
  }
};

exports.approveDriver = async (req, res) => {
  try {
    const { id } = req.params;
    await driverService.approveDriver(id, req.user.id);
    const driver = await driverService.getDriverById(id);
    if (driver?.one_signal_id) {
      const fullName =
        `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
        "Driver";
      await sendPushNotification(
        driver.one_signal_id,
        { en: "Profile Approved" },
        {
          en: `Hi ${fullName}, your profile has been approved! You can now start accepting rides.`,
        }
      );
      console.log(
        `📢 Push notification sent to driver (${fullName}) for profile approval`
      );
    } else {
      console.warn(
        `⚠️ Driver with ID ${id} has no OneSignal ID, skipping push notification`
      );
    }
    res.status(200).json({ message: "Driver approved" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await driverService.rejectDriver(id, reason, req.user.id);
    const driver = await driverService.getDriverById(id);
    if (driver?.one_signal_id) {
      const fullName =
        `${driver.first_name || ""} ${driver.last_name || ""}`.trim() ||
        "Driver";
      const message =
        driver.document_check_count >= 3
          ? `Hi ${fullName}, your profile has been blocked due to repeated rejections.
        Reason: ${reason || "Not Provided"}`
          : `Hi ${fullName}, your profile has been rejected. Reason: ${reason || "Not Provided."}`;
      await sendPushNotification(
        driver.one_signal_id,
        { en: "Profile Rejected" },
        { en: message }
      );
      console.log(
        `📢 Push notification sent to driver (${fullName}) for profile rejection`
      );
    } else {
      console.warn(
        `⚠️ Driver with ID ${id} has no OneSignal ID, skipping push notification`
      );
    }
    res.status(200).json({ message: "Driver rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.blockDriver = async (req, res) => {
  try {
    const { id } = req.params;
    await driverService.blockDriver(id, req.user.id);
    res.status(200).json({ message: "Driver blocked" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unblockDriver = async (req, res) => {
  try {
    const { id } = req.params;
    await driverService.unblockDriver(id, req.user.id);
    res.status(200).json({ message: "Driver unblocked" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyLicense = async (req, res) => {
  try {
    const { id } = req.params;
    await driverService.verifyLicense(id, req.user.id);
    res.status(200).json({ message: "License verified" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await driverService.rejectLicense(id, reason, req.user.id);
    res.status(200).json({ message: "License rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyEmirates = async (req, res) => {
  try {
    const { id } = req.params;
    await driverService.verifyEmirates(id, req.user.id);
    res.status(200).json({ message: "Emirates ID verified" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectEmirates = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await driverService.rejectEmirates(id, reason, req.user.id);
    res.status(200).json({ message: "Emirates ID rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... (previous exports remain the same)
