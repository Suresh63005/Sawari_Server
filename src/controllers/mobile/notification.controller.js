const {
  getNotificationsByUser,
} = require("../../services/notifications.service");

const getNotifications = async (req, res) => {
  try {
    const driverId = req.driver?.id;
    if (!driverId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const result = await getNotificationsByUser(driverId);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || "Failed to fetch notifications",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("Get Notifications Controller Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
};
