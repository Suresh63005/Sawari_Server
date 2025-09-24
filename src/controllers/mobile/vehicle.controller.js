const { getDriverById } = require("../../services/driver.service");
const { updateDriverCar, getDriverCarByDriverId, updateDriverDocuments } = require("../../services/driverCar.service");

const updateVehicle = async (req, res) => {
    const driver_id = req.driver?.id;
    if (!driver_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const { id, car_model, color, license_plate } = req.body;
    const files = req.files;
    try {

        const result = await updateDriverCar(driver_id, { id, car_model, color, license_plate }, files);
        return res.status(200).json({ success: true, message: "Vehicle details updated successfully", data: result });
    } catch (error) {
        console.error("Error updating vehicle:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const uploadDocuments = async (req, res) => {
    const driver_id = req.driver?.id;
    if (!driver_id) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const driver = await getDriverById(driver_id);
        const driverCar = await getDriverCarByDriverId(driver_id);
        const files = req.files;

        const result = await updateDriverDocuments({ driver, driverCar, files });
        return res.status(200).json({
            success: true,
            message: "Documents updated successfully",
            data: result,
        });
    } catch (error) {
        console.error("Error updating documents:", error);
        return res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

module.exports = {
    updateVehicle,
    uploadDocuments
};