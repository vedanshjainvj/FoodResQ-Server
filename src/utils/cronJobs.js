const cron = require('node-cron');
const Food = require('../models/Food');

/**
 * Schedule a task to run every 2 minutes to check for expired food
 * and update their expiryStatus to 'spoiled'
 */
const scheduleExpiryCheck = () => {
  console.log('Scheduling food expiry check cron job');
  
  // Run every 2 minutes (*/2 means every 2 minutes)
  cron.schedule('*/2 * * * *', async () => {
    try {
      console.log('Running food expiry check:', new Date().toISOString());
      
      // Find all food items that:
      // 1. Have expiryStatus 'eatable'
      // 2. expiryDate is before current time
      const currentDate = new Date();
      
      const result = await Food.updateMany(
        { 
          expiryStatus: 'eatable',
          expiryDate: { $lt: currentDate }
        },
        { 
          $set: { expiryStatus: 'spoiled' } 
        }
      );
      
      console.log(`Expiry check complete: ${result.modifiedCount} food items marked as spoiled`);
    } catch (error) {
      console.error('Error in food expiry cron job:', error);
    }
  });
};

module.exports = { scheduleExpiryCheck }; 