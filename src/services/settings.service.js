const Settings = require("../models/settings.model")


const getAllSettingService = async()=>{
    return Settings.findOne({
        attributes:["about_us","terms_conditions","privacy_policy","contact_email","contact_phone"]
    })
}

module.exports={
    getAllSettingService
}