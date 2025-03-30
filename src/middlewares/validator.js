const Joi = require('joi');

// Validation middleware
exports.validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    next();
  };
};

// Auth validation schemas
exports.registerSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('user', 'admin')
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

exports.updateProfileSchema = Joi.object({
  name: Joi.string().min(3).max(50),
  email: Joi.string().email(),
  phone: Joi.string().allow(''),
  location: Joi.string().allow(''),
  currentPassword: Joi.string().when('newPassword', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  newPassword: Joi.string().min(6).optional()
});

// User validation schemas
exports.updateUserSchema = Joi.object({
  name: Joi.string().min(3).max(50),
  email: Joi.string().email(),
  password: Joi.string().min(6)
});

// Food validation schemas
exports.createFoodSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).required(),
  quantity: Joi.string().required(),
  location: Joi.string().required(),
  expiryDate: Joi.date().required(),
  status: Joi.string().valid('available', 'reserved', 'collected'),
  image: Joi.string()
});

exports.updateFoodSchema = Joi.object({
  title: Joi.string().min(3).max(100),
  description: Joi.string().max(500),
  quantity: Joi.string(),
  location: Joi.string(),
  expiryDate: Joi.date(),
  status: Joi.string().valid('available', 'reserved', 'collected'),
  image: Joi.string()
}); 