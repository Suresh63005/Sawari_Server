const driverService = require('../../services/driver.service');

exports.getAllDrivers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const data = await driverService.getAllDrivers(Number(page), Number(limit), search, status);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveDriver = async (req, res) => {
  try {
    const { id } = req.params;
    await driverService.approveDriver(id, req.user.id);
    res.status(200).json({ message: 'Driver approved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await driverService.rejectDriver(id, reason, req.user.id);
    res.status(200).json({ message: 'Driver rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.blockDriver = async (req, res) => {
  try {
    const { id } = req.params;
    await driverService.blockDriver(id, req.user.id);
    res.status(200).json({ message: 'Driver blocked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.unblockDriver = async (req, res) => {
  try {
    const { id } = req.params;
    await driverService.unblockDriver(id, req.user.id);
    res.status(200).json({ message: 'Driver unblocked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.verifyLicense = async (req, res) => {
  try {
    const { id } = req.params;
    await driverService.verifyLicense(id, req.user.id);
    res.status(200).json({ message: 'License verified' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectLicense = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await driverService.rejectLicense(id, reason, req.user.id);
    res.status(200).json({ message: 'License rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyEmirates = async (req, res) => {
  try {
    const { id } = req.params;
    await driverService.verifyEmirates(id, req.user.id);
    res.status(200).json({ message: 'Emirates ID verified' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectEmirates = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await driverService.rejectEmirates(id, reason, req.user.id);
    res.status(200).json({ message: 'Emirates ID rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ... (previous exports remain the same)


