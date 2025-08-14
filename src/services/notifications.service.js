const { Op } = require('sequelize');
const Notifications = require('../models/notifications.model');
const { deleteFromS3 } = require('../config/fileUpload.aws');

const notificationDTO = (data)=>{
    return{
    title:data.title,
    message:data.message,
    image:data.image,
    is_read:data.is_read || false
}}

const noficationResponseDTO = (notification)=>{
    return{
        id:notification.id,
        title:notification.title,
        message:notification.message,
        image:notification.image,
        is_read:notification.is_read,
        createdAt:notification.createdAt
    }
}

/**
 * 
 *  Send notification service
 */

const sendNotificationService = async (notificationData) => {
  try {
    const payload = notificationDTO(notificationData);
    const newNotification = await Notifications.create(payload);
    return {
      success: true,
      message: "Notification sent successfully.",
      data: noficationResponseDTO(newNotification),
    };
  } catch (error) {
    console.error("Error sending notification:", error);
    return {
      success: false,
      message: "Failed to send notification",
      error: error.message,
    };
  }
};

const fetchAllNotifcationsService = async(queryParams)=>{
    const {search = '',is_read,sort_by = 'createdAt',order = 'DESC',limit = 10,page = 1,} = queryParams;
    const whereClause = {};

    if(search){
        whereClause[Op.or]=[
            { title: { [Op.like]: `%${search}%` } },
            { message: { [Op.like]: `%${search}%` } },
        ]
    }
    if (typeof is_read !== 'undefined') {
        whereClause.is_read = is_read === 'true';
    }
    try {
        const offset = (parseInt(page)-1)*parseInt(limit);
        const { rows, count } = await Notifications.findAndCountAll({
            where: whereClause,
            order: [[sort_by, order.toUpperCase()]],
            limit: parseInt(limit),
            offset,
        });
        return {
            success: true,
            data: rows.map(noficationResponseDTO),
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit),
            },
        };

    } catch (error) {
        console.error('Error fetching notifications:', error);
        return {
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message,
        };
    }
}

const fetchSingleNotificationService = async (id) => {
  try {
    const notification = await Notifications.findByPk(id);
    if (!notification) {
      return {
        success: false,
        message: 'Notification not found',
      };
    }

    return {
      success: true,
      data: noficationResponseDTO(notification),
    };
  } catch (error) {
    console.error('Error fetching notification:', error);
    return {
      success: false,
      message: 'Failed to fetch notification',
      error: error.message,
    };
  }
};

const deleteNotificationService = async (id) => {
  try {
    const notification = await Notifications.findByPk(id);
    if (!notification) {
      return {
        success: false,
        message: 'Notification not found',
      };
    }

    // If image exists, delete it from S3
    if (notification.image) {
      await deleteFromS3(notification.image);
    }

    await Notifications.destroy({ where: { id } });

    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return {
      success: false,
      message: 'Failed to delete notification',
      error: error.message,
    };
  }
};
module.exports = {
    sendNotificationService,
    fetchAllNotifcationsService,
    fetchSingleNotificationService,
    deleteNotificationService
}