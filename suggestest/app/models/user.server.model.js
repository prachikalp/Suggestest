'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
    var connection = mongoose.createConnection(config.database.url);
    autoIncrement.initialize(connection);

//All user fields are defined 
var UserSchema = new Schema({
  _id:Number,
  fbLogin:String,
  email:String,
  phone: String,
  countryCode:String,
  userName: String,
  userPassword:String,
  birthDate:String,
  token:String,
  photo:String,
  deviceType: {
  type : String,
    default : 'ANDROID',
    enum : ['IPHONE', 'ANDROID']
  },
  isForgotPassword:String,
  isActive:String,
  sessionToken:String,
  createdDate:{
      type:Date,
      default:Date.now
  },
  updatedDate:{
     type:Date,
     default:Date.now 
  }
});

UserSchema.plugin(autoIncrement.plugin,{
  model: 'User',
  field: '_id',
  startAt: 241,
  incrementBy:1
});

module.exports = connection.model('User', UserSchema);
module.exports = mongoose.model('User', UserSchema);