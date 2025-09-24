const Settings = require("../models/settings.model")


const getAllSettingService = async()=>{
    return Settings.findOne({
        attributes:["about_us","terms_conditions","privacy_policy","contact_email","contact_phone","tax_rate","min_wallet_percentage"]
    })
}

module.exports={
    getAllSettingService
}