const Settings = require("../models/settings.model");
const { uploadToS3, deleteFromS3 } = require("../config/fileUpload.aws");

const getAllSettingService = async () => {
  return Settings.findOne({
    attributes: [
      "about_us",
      "terms_conditions",
      "privacy_policy",
      "contact_email",
      "contact_phone",
      "tax_rate",
      "min_wallet_percentage",
      "weblogo",
      "web_name",
      "currency",
      "timezone",
    ],
  });
};

const getSettings = async () => {
  try {
    const settings = await Settings.findOne();
    return settings;
  } catch (error) {
    throw new Error("Failed to fetch settings: " + error.message);
  }
};

const upsertSettings = async (data, file) => {
  try {
    let weblogoUrl = data.weblogo || null;

    // Fetch existing settings if updating
    let existingSettings = null;
    if (data.id) {
      existingSettings = await Settings.findOne({ where: { id: data.id } });
    }

    // Upload new file if provided
    if (file) {
      weblogoUrl = await uploadToS3(file, "settings");
    } else if (existingSettings && existingSettings.weblogo) {
      // Preserve existing logo if no new file is uploaded
      weblogoUrl = existingSettings.weblogo;
    }

    const settingsData = {
      ...data,
      weblogo: weblogoUrl,
    };

    const [settings] = await Settings.upsert(settingsData, {
      returning: true,
    });

    // Delete old logo from S3 if a new one was uploaded
    if (
      existingSettings &&
      file &&
      existingSettings.weblogo &&
      existingSettings.weblogo !== weblogoUrl
    ) {
      await deleteFromS3(existingSettings.weblogo);
    }

    return settings;
  } catch (error) {
    throw new Error("Failed to save settings: " + error.message);
  }
};

module.exports = {
  getAllSettingService,
  getSettings,
  upsertSettings,
};
