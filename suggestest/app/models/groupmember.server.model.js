'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
    var connection = mongoose.createConnection(config.database.url);
    autoIncrement.initialize(connection);

//All Category  fields are defined 
var GroupMemberSchema = new Schema({
  groupId:{
    type:Number,
    ref:'Group'
  },
  fromUserId:{
    type:Number,
    ref:'User'
  },
  toUserId:{
    type:Number,
    ref:'User'
  },
  createdAt:{
    type:String,
    default:'0000-00-00 00:00:00'
  },
  //For Point Of Migration
  status:{
    type:Number,
    default:0
  }
});

GroupMemberSchema.plugin(autoIncrement.plugin,{
  model: 'GroupMember',
  field: '_id',
  startAt: 149,
  incrementBy:1
});

module.exports = connection.model('GroupMember', GroupMemberSchema);
module.exports = mongoose.model('GroupMember', GroupMemberSchema);