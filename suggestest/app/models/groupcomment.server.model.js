'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
    var connection = mongoose.createConnection(config.database.url);
    autoIncrement.initialize(connection);

//All Category  fields are defined 
var GroupCommentSchema = new Schema({
  groupId:{
    type:Number,
    ref:'Group'
  },
  comments:String,
  createdBy:{
    type:Number,
    ref:'User'
  },
  createdAt:{
    type:String,
    default:'0000-00-00 00:00:00'
  },
  //Changed due to migration
  deleted:{
    type:Number,  
    default:0
  }
});

GroupCommentSchema.plugin(autoIncrement.plugin,{
  model: 'GroupComment',
  field: '_id',
  startAt: 189,
  incrementBy:1
});

module.exports = connection.model('GroupComment', GroupCommentSchema);
module.exports = mongoose.model('GroupComment', GroupCommentSchema);