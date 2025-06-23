const Joi = require("joi");

const registerValidation = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("student", "teacher", "admin").required(),

  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Phone number must be a valid 10-digit Indian number.",
    }),

  address: Joi.string().min(5).required(),

  class: Joi.when("role", {
    is: "student",
    then: Joi.number().min(1).max(10).required(),
    otherwise: Joi.forbidden(),
  }),

  rollNumber: Joi.when("role", {
    is: "student",
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
});

const loginValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = {
  registerValidation,
  loginValidation,
};
