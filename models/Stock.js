const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema({
  symbol: { 
    type: String, 
    required: true, 
    unique: true 
  },
  likes: { 
    type: [String], 
    default: [] 
  }
});

module.exports = mongoose.model('Stock', StockSchema);
