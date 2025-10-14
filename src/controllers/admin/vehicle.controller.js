const DriverCar = require("../../models/driver-cars.model");
const vehicleService = require("../../services/driverCar.service");
const driverService = require("../../services/driver.service");
const { sendPushNotification } = require("../../helper/sendPushNotification");
const {
  sendNotificationService,
} = require("../../services/notifications.service");
// const { sendNotificationService } = require("../../services/notifications.service");

exports.getAllVehicles = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "", status = "all" } = req.query;
    const vehicles = await vehicleService.getAllVehicles({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      status,
    });

    console.log("vehiclessssssssssssss:", vehicles);
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log("Error fetching vehicles:", error);
  }
};

exports.getVehiclesByDriver = async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is required" });
    }

    console.log("Fetching vehicles for driverId:", driverId);

    // Fetch all vehicles for this driver
    const vehicles = await vehicleService.getVehiclesByDriver(driverId);

    // Fetch driver details
    const driver = await driverService.getDriverById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const fullName =
      `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "Driver";

    // Add driver name to every vehicle
    const vehiclesWithDriver = vehicles.map((vehicle) => ({
      ...vehicle,
      driver_name: fullName,
    }));

    res.status(200).json({
      driver_name: fullName,
      total: vehiclesWithDriver.length,
      data: vehiclesWithDriver,
    });
  } catch (error) {
    console.error("Error fetching vehicles by driver:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.approveVehicle = async (req, res) => {
  try {
    const { id } = req.params; // vehicle ID
    const car = await DriverCar.findByPk(id, {
      attributes: ["id", "driver_id", "license_plate"],
    });
    if (!car) throw new Error("Vehicle not found");

    await car.update({
      is_approved: true,
      status: "active",
      verified_by: req.user.id,
      reason: null,
    });

    // Correctly fetch driver by driver_id
    const driver = await driverService.getDriverById(car.driver_id);
    const fullName =
      `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "Driver";
    const heading = { en: "Vehicle Approved" };
    const message = {
      en: `Hi ${fullName}, your vehicle (License Plate: ${car.license_plate}) has been approved!`,
    };
    // ✅ Always create a notification entry in DB
    await sendNotificationService({
      user_id: driver.id,
      title: heading.en,
      message: message.en,
      is_read: false,
      image: null,
    });
    console.log(`🗂️ Notification saved for driver (${driver.id})`);
    if (driver?.one_signal_id) {
      await sendPushNotification(driver.one_signal_id, heading, message);
      console.log(
        `📢 Push notification sent to driver (${fullName}) for vehicle approval`
      );
    } else {
      console.warn(
        `⚠️ Driver with ID ${car.driver_id} has no OneSignal ID, skipping push notification`
      );
    }

    res.status(200).json({ message: "Vehicle approved" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const car = await DriverCar.findByPk(id, {
      attributes: ["id", "driver_id", "license_plate"],
    });
    if (!car) throw new Error("Vehicle not found");
    await car.update({
      is_approved: false,
      status: "rejected",
      reason,
      verified_by: req.user.id,
    });
    // Fetch driver to get one_signal_id
    const driver = await driverService.getDriverById(id);
    const fullName =
      `${driver.first_name || ""} ${driver.last_name || ""}`.trim() || "Driver";
    const heading = { en: "Vehicle Rejected" };
    const message = {
      en: `Hi ${fullName}, your vehicle (License Plate: ${car.license_plate}) has been rejected!`,
    };
    await sendNotificationService({
      user_id: driver.id,
      title: heading.en,
      message: message.en,
      is_read: false,
      image: null,
    });
    console.log(`🗂️ Notification saved for driver (${driver.id})`);
    if (driver?.one_signal_id) {
      await sendPushNotification(driver.one_signal_id, heading, message);
      console.log(
        `📢 Push notification sent to driver (${fullName}) for vehicle approval`
      );
    } else {
      console.warn(
        `⚠️ Driver with ID ${car.driver_id} has no OneSignal ID, skipping push notification`
      );
    }
    res.status(200).json({ message: "Vehicle rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyRc = async (req, res) => {
  try {
    const { id } = req.params;
    await vehicleService.verifyRc(id, req.user.id);
    res.status(200).json({ message: "RC document verified" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectRc = async (req, res) => {
  try {
    const { id } = req.params;
    await vehicleService.rejectRc(id, req.user.id);
    res.status(200).json({ message: "RC document rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyInsurance = async (req, res) => {
  try {
    const { id } = req.params;
    await vehicleService.verifyInsurance(id, req.user.id);
    res.status(200).json({ message: "Insurance document verified" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectInsurance = async (req, res) => {
  try {
    const { id } = req.params;
    await vehicleService.rejectInsurance(id, req.user.id);
    res.status(200).json({ message: "Insurance document rejected" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... (previous exports remain the same)
