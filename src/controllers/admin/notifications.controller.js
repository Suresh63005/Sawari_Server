const { default: axios } = require("axios");
const notificationService = require("../../services/notifications.service");
const { uploadToS3 } = require("../../config/fileUpload.aws");
require("dotenv").config();

/**
 *  Send notifications to all users via one-signal
 *  and store it in the database
 */

// const sendNotificationController = async(req,res)=>{
//     try {
//         const {title,message}=req.body;
//         let imageUrl=null;
//         if(!title || !message){
//             return res.status(400).json({
//                 success:false,
//                 message:"Title and message are required"
//             })
//         }

//         // Upload image if provided
//         if(req.file){
//             imageUrl = await uploadToS3(req.file)
//         }

//         // Send push notification using one-signal
//         const response = await axios.post("https://onesignal.com/api/v1/notifications",{
//             api_id:process.env.ONE_SIGNAL_APP_ID,
//             included_segments: ["All"],
//             headings: { en: title },
//             contents: { en: message },
//             big_picture: imageUrl || undefined,
//         },{
//             headers:{
//                 Authorization:`Basic ${process.env.ONE_SIGNAL_API_KEY}`,
//                 "Content-Type":"application/json; charset=utf-8"
//             }
//         })

//         const result =  await notificationService.sendNotificationService({title,message,image:imageUrl})

//         return res.status(200).json({
//             success:true,
//             message:"Notification sent successfully.",
//             oneSignalResponse:response.data,
//             data:result.data
//         })
//     } catch (error) {
//         console.error("Error sending notification:", error);
//         return res.status(500).json({
//         success: false,
//         message: "Failed to send notification",
//         error: error.message,
//         });
//     }
// }

const sendNotificationController = async (req, res) => {
  try {
    const { title, message } = req.body;
    let imageUrl = null;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    // Upload image if provided
    if (req.file) {
      imageUrl = await uploadToS3(req.file);
    }

    // Save notification to database
    const result = await notificationService.sendNotificationService({
      title,
      message,
      image: imageUrl,
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || "Failed to save notification",
        error: result.error,
      });
    }

    let oneSignalResponse = null;
    let pushError = null;

    // Send OneSignal push notification to all drivers
    try {
      const response = await axios.post(
        "https://onesignal.com/api/v1/notifications",
        {
          app_id: process.env.ONE_SIGNAL_APP_ID,
          included_segments: ["All"], // Targets all drivers
          headings: { en: title },
          contents: { en: message },
          big_picture: imageUrl || undefined,
        },
        {
          headers: {
            Authorization: `Basic ${process.env.ONE_SIGNAL_API_KEY}`,
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
      oneSignalResponse = response.data;
    } catch (err) {
      console.error("OneSignal Push Error:", err.response?.data || err.message);
      pushError = err.response?.data || err.message;
    }

    return res.status(200).json({
      success: true,
      message:
        "Notification saved. Push " +
        (pushError ? "failed" : "sent successfully."),
      oneSignalResponse: oneSignalResponse || null,
      pushError: pushError || null,
      data: result.data,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send notification",
      error: error.message,
    });
  }
};

const getAllNotificationsController = async (req, res) => {
  const result = await notificationService.fetchAllNotifcationsService(
    req.query
  );
  res.status(result.success ? 200 : 500).json(result);
};

const getSingleNotificationController = async (req, res) => {
  const result = await notificationService.fetchSingleNotificationService(
    req.params.id
  );
  res.status(result.success ? 200 : 404).json(result);
};
const deleteNotificationController = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required",
      });
    }
    const result = await notificationService.deleteNotificationService(id);
    return res.status(200).json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

module.exports = {
  sendNotificationController,
  getAllNotificationsController,
  getSingleNotificationController,
  deleteNotificationController,
};
