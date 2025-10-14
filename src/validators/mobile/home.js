const Joi = require("joi");

const startRideSchema = Joi.object({
  rideId: Joi.string().uuid().required().messages({
    "string.uuid": "rideId must be a valid UUID",
    "any.required": "rideId is required",
  }),
});

module.exports = {
  startRideSchema,
};
