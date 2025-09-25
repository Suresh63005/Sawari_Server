const Settings = require("../models/settings.model");


const getAllSettingService = async()=>{
    return Settings.findOne({
        attributes:["about_us","terms_conditions","privacy_policy","contact_email","contact_phone","tax_rate","min_wallet_percentage"]
    });
};


const getSettings = async () => {
  try {
    const settings = await Settings.findOne();
    return settings;
  } catch (error) {
    throw new Error("Failed to fetch settings",error);
  }
};

const upsertSettings = async (data) => {
  try {
    const [settings] = await Settings.upsert(data, {
      returning: true,
    });
    return settings;
  } catch (error) {
    throw new Error("Failed to save settings",error);
  }
};

module.exports = {
  getAllSettingService,
  getSettings,
  upsertSettings
};


