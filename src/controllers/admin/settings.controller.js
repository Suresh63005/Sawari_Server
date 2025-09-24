const { getSettings, upsertSettings } = require('../../services/settings.service');

const getSettingsController = async (req, res) => {
  try {
    const settings = await getSettings();
    return res.status(200).json({
      status: true,
      result: settings || {},
      message: 'Settings retrieved successfully',
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({
      status: false,
      error: error.message || 'Failed to retrieve settings',
    });
  }
};

const upsertSettingsController = async (req, res) => {
  try {
    const settingsData = req.body;
    const settings = await upsertSettings(settingsData);
    return res.status(200).json({
      status: true,
      result: settings,
      message: 'Settings saved successfully',
    });
  } catch (error) {
    console.error('Upsert settings error:', error);
    return res.status(500).json({
      status: false,
      error: error.message || 'Failed to save settings',
    });
  }
};

module.exports = {
  getSettingsController,
  upsertSettingsController,
};