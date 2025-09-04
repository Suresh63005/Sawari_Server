const Notifications = require("../../models/notifications.model");
const { getNotificationsByUser } = require("../../services/notifications.service");


const getNotifications = async (req, res) => {
    try{
        const driverId = req.driver?.id;
        if(!driverId){
            return res.status(401).json({message:"Unauthorized"});
        }
        const notifications = await getNotificationsByUser(driverId);
       
        res.status(200).json({
            message: "Notifications fetched successfully",
            data: notifications
        });

    }
    catch(error){
        console.error("Get Notifications Controller Error:", error);
        res.status(500).json({message:error.message});
    }
}


module.exports = {
    getNotifications
};