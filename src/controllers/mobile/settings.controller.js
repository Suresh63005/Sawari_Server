const { getAllSettingService } = require("../../services/settings.service");

const getAllSettings = async (req, res) => {
  // const driver_id = req.driver?.id;
  // if (!driver_id) {
  //     return res.status(401).json({ message: "Unauthorized" });
  // }
  try {
    const settings = await getAllSettingService();
    if (!settings) {
      return res
        .status(404)
        .json({ success: false, message: "Settings not found" });
    }
    return res.status(200).json({
      success: true,
      message: "settings fetched sucessfully!",
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  getAllSettings,
};
