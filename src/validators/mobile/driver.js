const Joi = require("joi");

const updateDriverProfileSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(50).required(),
  last_name: Joi.string().trim().min(1).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^\+\d{1,3}\d{9,12}$/)
    .required(), // E.g., +971444444444
  dob: Joi.string()
    .pattern(/^\d{2}-\d{2}-\d{4}$/)
    .required(),
  languages: Joi.array().items(Joi.string().trim().min(1)).required(),
  experience: Joi.number().integer().min(0).required(),
  emirates_id: Joi.string()
    .pattern(/^\d{15}$/)
    .required(), // 15-digit Emirates ID
  car_id: Joi.string().uuid().required(),
  license_plate: Joi.string().trim().min(1).max(20).required(),
  full_address: Joi.string().trim().min(1).max(255).required(),
  color: Joi.string().trim().min(1).max(50).required(),
  profile_pic: Joi.string().uri().required(),
  license_front: Joi.string().uri().required(),
  license_back: Joi.string().uri().required(),
  car_photos: Joi.array().items(Joi.string().uri()).required(),
  rc_doc: Joi.string().uri().required(),
  rc_doc_back: Joi.string().uri().required(),
  insurance_doc: Joi.string().uri().required(),
  emirates_doc_front: Joi.string().uri().required(),
  emirates_doc_back: Joi.string().uri().required(),
});

const blockDriverSchema = Joi.object({
  phone: Joi.string()
    .allow("") // Allow invalid formats to pass validation
    .optional(),
  email: Joi.string()
    .allow("") // Allow invalid formats to pass validation
    .optional(),
})
  .xor("phone", "email")
  .messages({
    "object.xor": "Provide either phone or email, not both or neither.",
  });

const updateStatusSchema = Joi.object({
  ride_request: Joi.boolean().allow(null).default(true),
  system_alerts: Joi.boolean().allow(null).default(true),
  earning_updates: Joi.boolean().allow(null).default(true),
});

module.exports = {
  updateDriverProfileSchema,
  blockDriverSchema,
  updateStatusSchema,
};
