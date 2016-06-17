'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
    var connection = mongoose.createConnection(config.database.url);
    autoIncrement.initialize(connection);

//All Request fields are defined 
var RequestSchema = new Schema({
  requestFromId: {
    type:Number,
    ref:'User'
  },
  requestToId: {
    type:Number,
    ref:'User'
  },
  requestedMessage:String,
  request_Type:String,
  status:String,
  requestedAt:String,
  lastAlertViewed:String
});

RequestSchema.plugin(autoIncrement.plugin,{
  model: 'Request',
  field: '_id',
  startAt: 654,
  incrementBy:1
});

module.exports = connection.model('Request', RequestSchema);
module.exports = mongoose.model('Request', RequestSchema);