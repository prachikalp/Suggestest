'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
    var connection = mongoose.createConnection(config.database.url);
    autoIncrement.initialize(connection);

//All user fields are defined 
var suggestionMapSchema = new Schema({
  suggestionId:{
    type:Number,
    ref:'Suggestion'
  },
  postedTo:{
    type:Number,
    ref:'User'
  },
  reported : String,
  lastAlertViewed:{
    type:String,
    default:'0000-00-00 00:00:00'
  }
});

suggestionMapSchema.plugin(autoIncrement.plugin,{
  model: 'suggestionMap',
  field: '_id',
  startAt: 3958,
  incrementBy:1
});

module.exports = connection.model('suggestionMap', suggestionMapSchema);
module.exports = mongoose.model('suggestionMap', suggestionMapSchema);