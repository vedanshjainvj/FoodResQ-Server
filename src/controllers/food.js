const Food = require('../models/Food');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all food listings
// @route   GET /api/food
// @access  Public
exports.getAllFood = async (req, res) => {
  try {
    // Add query parameters for filtering
    const query = { ...req.query };
    
    // Fields to exclude from filtering
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete query[param]);
    
    // Create query string
    let queryStr = JSON.stringify(query);
    
    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    
    // Finding resources
    let foodQuery = Food.find(JSON.parse(queryStr)).populate({
      path: 'createdBy',
      select: 'name role'
    });
    
    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      foodQuery = foodQuery.select(fields);
    }
    
    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      foodQuery = foodQuery.sort(sortBy);
    } else {
      foodQuery = foodQuery.sort('-createdAt');
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Food.countDocuments(JSON.parse(queryStr));
    
    foodQuery = foodQuery.skip(startIndex).limit(limit);
    
    // Execute query
    const food = await foodQuery;
    
    // Pagination result
    const pagination = {};
    
    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }
    
    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }
    
    res.status(200).json({
      success: true,
      count: food.length,
      pagination,
      data: food
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single food listing
// @route   GET /api/food/:id
// @access  Public
exports.getFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id).populate({
      path: 'createdBy',
      select: 'name role'
    });
    
    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Food listing not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: food
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new food listing
// @route   POST /api/food
// @access  Private/Admin
exports.createFood = async (req, res) => {
  try {
    // Add user to req.body
    req.body.createdBy = req.user.id;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can create food listings'
      });
    }
    
    const food = await Food.create(req.body);
    
    res.status(201).json({
      success: true,
      data: food
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update food listing
// @route   PUT /api/food/:id
// @access  Private/Admin
exports.updateFood = async (req, res) => {
  try {
    let food = await Food.findById(req.params.id);
    
    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Food listing not found'
      });
    }
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update food listings'
      });
    }
    
    // Check if the food listing belongs to this admin user
    if (food.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own food listings'
      });
    }
    
    food = await Food.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: food
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete food listing
// @route   DELETE /api/food/:id
// @access  Private/Admin
exports.deleteFood = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    
    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Food listing not found'
      });
    }
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete food listings'
      });
    }
    
    // Check if the food listing belongs to this admin user
    if (food.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own food listings'
      });
    }
    
    await food.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Accept food (with partial quantity support)
// @route   POST /api/food/:id/accept
// @access  Private
exports.acceptFood = async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please specify a valid quantity to accept'
      });
    }
    
    const food = await Food.findById(req.params.id);
    
    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Food listing not found'
      });
    }
    
    // Check if food is still available
    if (food.status === 'collected') {
      return res.status(400).json({
        success: false,
        error: 'This food has already been fully collected'
      });
    }
    
    // Check if requested quantity is valid
    if (quantity > food.remainingQuantity) {
      return res.status(400).json({
        success: false,
        error: `Cannot accept more than the remaining quantity (${food.remainingQuantity} ${food.quantityUnit})`
      });
    }
    
    // Update the remaining quantity
    food.remainingQuantity -= quantity;
    
    // Add transaction record
    food.transactions.push({
      userId: req.user.id,
      userName: req.user.name,
      quantity
    });
    
    // Save the updated food
    await food.save();
    
    res.status(200).json({
      success: true,
      data: food
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports; 