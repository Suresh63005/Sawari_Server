const axios = require("axios");

const sendPushNotification = async (playerId, heading, message) => {
  try {
    const response = await axios.post(
      process.env.ONESIGNAL_BASE_URL,
      {
        app_id: process.env.ONESIGNAL_APP_ID,
        include_player_ids: [playerId],
        headings: heading,
        contents: message,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${process.env.ONESIGNAL_API_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(
      "OneSignal Push Error:",
      error.response?.data || error.message
    );
  }
};
module.exports = { sendPushNotification };
