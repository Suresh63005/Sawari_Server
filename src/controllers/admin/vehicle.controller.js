const DriverCar = require('../../models/driver-cars.model');
const vehicleService = require('../../services/driverCar.service');

exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await vehicleService.getAllVehicles();
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const car = await DriverCar.findByPk(id);
    if (!car) throw new Error('Vehicle not found');
    await car.update({ is_approved: true, status: 'active', verified_by: req.user.id });
    res.status(200).json({ message: 'Vehicle approved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const car = await DriverCar.findByPk(id);
    if (!car) throw new Error('Vehicle not found');
    await car.update({ is_approved: false, status: 'rejected', reason, verified_by: req.user.id });
    res.status(200).json({ message: 'Vehicle rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.verifyRc = async (req, res) => {
  try {
    const { id } = req.params;
    await vehicleService.verifyRc(id, req.user.id);
    res.status(200).json({ message: 'RC document verified' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectRc = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await vehicleService.rejectRc(id, reason, req.user.id);
    res.status(200).json({ message: 'RC document rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyInsurance = async (req, res) => {
  try {
    const { id } = req.params;
    await vehicleService.verifyInsurance(id, req.user.id);
    res.status(200).json({ message: 'Insurance document verified' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectInsurance = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await vehicleService.rejectInsurance(id, reason, req.user.id);
    res.status(200).json({ message: 'Insurance document rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... (previous exports remain the same)