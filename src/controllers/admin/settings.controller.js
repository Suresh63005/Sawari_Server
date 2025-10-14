const {
  getSettings,
  upsertSettings,
} = require("../../services/settings.service");

const getSettingsController = async (req, res) => {
  try {
    const settings = await getSettings();
    res.status(200).json({ result: settings });
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.error(`Error in getSettingsController: ${error.message}`);
  }
};

const upsertSettingsController = async (req, res) => {
  try {
    const settingsData = {
      id: req.body.id,
      web_name: req.body.web_name,
      contact_email: req.body.contact_email,
      contact_phone: req.body.contact_phone,
      tax_rate: parseFloat(req.body.tax_rate) || 0.0,
      currency: req.body.currency,
      timezone: req.body.timezone,
      about_us: req.body.about_us,
      terms_conditions: req.body.terms_conditions,
      privacy_policy: req.body.privacy_policy,
      min_wallet_percentage: parseFloat(req.body.min_wallet_percentage) || 0.0,
    };

    const result = await upsertSettings(settingsData, req.file);

    res.status(200).json({ result, message: "Settings saved successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
    console.error(`Error in upsertSettingsController: ${error.message}`);
  }
};

module.exports = {
  getSettingsController,
  upsertSettingsController,
};
