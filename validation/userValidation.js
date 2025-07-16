const Joi = require("joi");

const indianPhonePattern = /^[6-9]\d{9}$/;

const registerValidation = Joi.object({
  // ✅ Common Fields
  name: Joi.string().min(3).max(50).required().messages({
    "string.base": "Name must be a string.",
    "string.empty": "Name is required.",
    "string.min": "Name must be at least 3 characters.",
    "string.max": "Name must be at most 50 characters.",
  }),

  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format.",
    "string.empty": "Email is required.",
  }),

  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters.",
    "string.empty": "Password is required.",
  }),

  role: Joi.string()
    .valid("student", "parent", "teacher", "admin")
    .required()
    .messages({
      "any.only": "Role must be either student, parent, teacher or admin.",
      "string.empty": "Role is required.",
    }),

  phone: Joi.string().pattern(indianPhonePattern).required().messages({
    "string.pattern.base":
      "Phone number must be a valid 10-digit Indian number.",
    "string.empty": "Phone number is required.",
  }),

  address: Joi.when("role", {
    is: "teacher",
    then: Joi.forbidden().messages({
      "any.unknown": "Address is not allowed for teachers.",
    }),
    otherwise: Joi.string().min(5).required().messages({
      "string.min": "Address must be at least 5 characters.",
      "any.required": "Address is required.",
      "string.empty": "Address cannot be empty.",
    }),
  }),

  status: Joi.string()
    .valid("active", "leaved", "passout", "inactive")
    .optional(),
  remark: Joi.string().allow("").optional(),
  photo: Joi.string().uri().optional().messages({
    "string.uri": "Photo must be a valid URL.",
  }),

  // ⛔️ Forbidden: Injected from token
  schoolId: Joi.forbidden().messages({
    "any.unknown": "schoolId should not be sent in request body.",
  }),

  // ✅ Student-specific Fields
  class: Joi.when("role", {
    is: "student",
    then: Joi.number().min(1).max(10).required().messages({
      "number.base": "Class must be a number between 1 and 10.",
      "any.required": "Class is required for students.",
    }),
    otherwise: Joi.forbidden(),
  }),

  rollNumber: Joi.when("role", {
    is: "student",
    then: Joi.string().required().messages({
      "string.empty": "Roll number is required for students.",
    }),
    otherwise: Joi.forbidden(),
  }),

  enrollmentDate: Joi.when("role", {
    is: "student",
    then: Joi.date().iso().required().messages({
      "date.base": "Enrollment date must be a valid ISO date.",
      "any.required": "Enrollment date is required for students.",
    }),
    otherwise: Joi.forbidden(),
  }),

  birthCertificate: Joi.when("role", {
    is: "student",
    then: Joi.string().required().messages({
      "string.empty": "Birth certificate is required for students.",
    }),
    otherwise: Joi.forbidden(),
  }),

  transferCertificate: Joi.when("role", {
    is: "student",
    then: Joi.string().optional().allow("").messages({
      "string.base": "Transfer certificate must be a string.",
    }),
    otherwise: Joi.forbidden(),
  }),

  marksheet: Joi.when("role", {
    is: "student",
    then: Joi.string().optional().allow("").messages({
      "string.base": "Marksheet must be a string.",
    }),
    otherwise: Joi.forbidden(),
  }),

  // ✅ Teacher-specific Fields
  qualifications: Joi.when("role", {
    is: "teacher",
    then: Joi.array()
      .items(
        Joi.object({
          type: Joi.string().min(2).required(),
          institution: Joi.string().min(2).required(),
          year: Joi.string()
            .pattern(/^\d{4}$/)
            .required()
            .messages({
              "string.pattern.base": "Year must be a 4-digit number.",
            }),
          file: Joi.any().optional(),
        })
      )
      .min(1)
      .required()
      .messages({
        "array.base": "Qualifications must be an array.",
        "array.min": "At least one qualification is required for teachers.",
        "any.required": "Qualifications are required for teachers.",
      }),
    otherwise: Joi.forbidden(),
  }),

  dob: Joi.when("role", {
    is: "teacher",
    then: Joi.date().iso().required().messages({
      "date.base": "DOB must be a valid date.",
      "any.required": "DOB is required for teachers.",
    }),
    otherwise: Joi.forbidden(),
  }),

  subject: Joi.when("role", {
    is: "teacher",
    then: Joi.string().required().label("Subject is required for teachers"),
    otherwise: Joi.optional(),
  }),

  aadhaarNumber: Joi.when("role", {
    is: "teacher",
    then: Joi.string()
      .pattern(/^\d{4}\s\d{4}\s\d{4}$/)
      .required()
      .messages({
        "string.pattern.base":
          "Aadhaar number must be in XXXX XXXX XXXX format.",
        "string.empty": "Aadhaar number is required for teachers.",
      }),
    otherwise: Joi.forbidden(),
  }),

  aadhaarCard: Joi.string().required().messages({
    "string.empty": "Aadhaar card is required.",
  }),

  postOffice: Joi.when("role", {
    is: "teacher",
    then: Joi.string().required().messages({
      "string.empty": "Post Office is required for teachers.",
    }),
    otherwise: Joi.forbidden(),
  }),

  subDistrict: Joi.when("role", {
    is: "teacher",
    then: Joi.string().required().messages({
      "string.empty": "Sub-district is required for teachers.",
    }),
    otherwise: Joi.forbidden(),
  }),

  state: Joi.when("role", {
    is: "teacher",
    then: Joi.string().required().messages({
      "string.empty": "State is required for teachers.",
    }),
    otherwise: Joi.forbidden(),
  }),

  pincode: Joi.when("role", {
    is: "teacher",
    then: Joi.string()
      .pattern(/^\d{6}$/)
      .required()
      .messages({
        "string.pattern.base": "Pincode must be a 6-digit number.",
        "string.empty": "Pincode is required for teachers.",
      }),
    otherwise: Joi.forbidden(),
  }),

  vtc: Joi.string().optional(),
});

const loginValidation = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format.",
    "string.empty": "Email is required.",
  }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required.",
  }),
});

module.exports = {
  registerValidation,
  loginValidation,
};
