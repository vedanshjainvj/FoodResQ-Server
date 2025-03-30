const Food = require('../models/Food');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const { uploadImage } = require('../utils/cloudinary');
const { sendFoodPostNotification } = require('../utils/sendWhatsappMessage');
const {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  generateFoodListCacheKey,
  generateFoodDetailCacheKey
} = require('../utils/redisUtils');

// @desc    Get all food listings
// @route   GET /api/food
// @access  Public
exports.getAllFood = async (req, res) => {
  try {
    // Generate cache key based on query parameters
    const cacheKey = generateFoodListCacheKey(req.query);
    
    // Try to get data from cache first
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        count: cachedData.count,
        pagination: cachedData.pagination,
        data: cachedData.data,
        fromCache: true
      });
    }
    
    // If not in cache, proceed with database query
    // Add query parameters for filtering
    const query = { ...req.query };
    
    // Fields to exclude from filtering
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach(param => delete query[param]);
    
    // Create query string
    let queryStr = JSON.stringify(query);
    
    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
    
    // Default to showing only eatable food if no expiryStatus filter is provided
    const parsedQuery = JSON.parse(queryStr);
    if (!parsedQuery.expiryStatus) {
      parsedQuery.expiryStatus = 'eatable';
    }
    
    // Finding resources
    let foodQuery = Food.find(parsedQuery).populate({
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
    const total = await Food.countDocuments(parsedQuery);
    
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
    
    // Calculate total pages for frontend pagination
    pagination.totalPages = Math.ceil(total / limit);
    
    // Prepare response data
    const responseData = {
      success: true,
      count: food.length,
      pagination,
      data: food
    };
    
    // Store in cache (expires in 5 minutes for listings to stay relatively fresh)
    await setCache(cacheKey, { count: food.length, pagination, data: food }, 300);
    
    res.status(200).json(responseData);
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
    const foodId = req.params.id;
    const cacheKey = generateFoodDetailCacheKey(foodId);
    
    // Try to get from cache first
    const cachedFood = await getCache(cacheKey);
    if (cachedFood) {
      return res.status(200).json({
        success: true,
        data: cachedFood,
        fromCache: true
      });
    }
    
    // If not in cache, get from database
    const food = await Food.findById(foodId).populate({
      path: 'createdBy',
      select: 'name role'
    });
    
    if (!food) {
      return res.status(404).json({
        success: false,
        error: 'Food listing not found'
      });
    }
    
    // Store in cache (expires in 15 minutes)
    await setCache(cacheKey, food, 900);
    
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
    
    // Handle image upload if it exists
    if (req.body.image && req.body.image !== 'default-food.jpg' && req.body.image.startsWith('data:image')) {
      try {
        const imageUrl = await uploadImage(req.body.image);
        req.body.image = imageUrl;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          error: 'Image upload failed. Please try again.'
        });
      }
    }
    
    const food = await Food.create(req.body);
    
    // Clear all food listings cache as we have a new item
    await deleteCacheByPattern('food:list:*');
    
    // Get admin's phone number and send WhatsApp notification
    try {
      const admin = await User.findById(req.user.id);
      if (admin && admin.phone) {
        // Format phone number if needed
        const formattedPhone = admin.phone.startsWith('+') ? admin.phone : `+91${admin.phone}`;
        
        // Send notification asynchronously
        sendFoodPostNotification(formattedPhone, food).catch(err => {
          console.error('WhatsApp food notification error:', err);
        });
      }
    } catch (err) {
      console.error('Error fetching admin for notification:', err);
      // Don't stop the response for notification errors
    }
    
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
    
    // Handle image upload if it exists and has changed
    if (req.body.image && 
        req.body.image !== food.image && 
        req.body.image !== 'default-food.jpg' && 
        req.body.image.startsWith('data:image')) {
      try {
        const imageUrl = await uploadImage(req.body.image);
        req.body.image = imageUrl;
      } catch (uploadError) {
        return res.status(400).json({
          success: false,
          error: 'Image upload failed. Please try again.'
        });
      }
    }
    
    food = await Food.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    // Clear cache for this specific food item
    await deleteCache(generateFoodDetailCacheKey(req.params.id));
    
    // Clear all food listings cache as we've updated an item
    await deleteCacheByPattern('food:list:*');
    
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
    
    // Clear cache for this specific food item
    await deleteCache(generateFoodDetailCacheKey(req.params.id));
    
    // Clear all food listings cache as we've deleted an item
    await deleteCacheByPattern('food:list:*');
    
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
    
    // Clear cache for this specific food item
    await deleteCache(generateFoodDetailCacheKey(req.params.id));
    
    // Clear all food listings cache as the quantities have changed
    await deleteCacheByPattern('food:list:*');
    
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