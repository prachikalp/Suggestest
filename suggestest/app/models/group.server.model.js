'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
    var connection = mongoose.createConnection(config.database.url);
    autoIncrement.initialize(connection);

//All Category  fields are defined 
var GroupSchema = new Schema({
  groupName:String,
  category:{
    type:Number,
    ref:'Category'
  },
  type:{
    type:Number,
    ref:'SuggestionType'
  },
  location:String,
  groupImage:String,
  awsImageUrl:String,
  groupDescription:String,
  createdBy:{
    type:Number,
    ref:'User'
  },
  createdAt:{
    type:String,
    default:'0000-00-00 00:00:00'
  },
  //For point Of Migration
  deleted:{
    type:Number,
    default:0
  }
});

GroupSchema.plugin(autoIncrement.plugin,{
  model: 'Group',
  field: '_id',
  startAt: 101,
  incrementBy:1
});

module.exports = connection.model('Group', GroupSchema);
module.exports = mongoose.model('Group', GroupSchema);