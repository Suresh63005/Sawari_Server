const Settings = require("../models/settings.model")


const getAllSettingService = async()=>{
    return Settings.findOne()
}

module.exports={
    getAllSettingService
}