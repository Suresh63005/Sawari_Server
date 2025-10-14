// const Joi = require("joi");

// // Define the Joi schema
// const verifyMobileSchema = Joi.object({
//   phone: Joi.string().pattern(/^+971[0-9]{9}$/).optional(),
//   token: Joi.string().required(),
//   email: Joi.string().email().when("social_login", { is: "google", then: Joi.required() }),
//   social_login: Joi.string().valid("google", "facebook", "twitter").optional(),
// });

// module.exports = {
//     verifyMobileSchema,

// };
