'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
    var connection = mongoose.createConnection(config.database.url);
    autoIncrement.initialize(connection);

//All suggestion fields are defined 
var SuggestionSchema = new Schema({
  suggestionType: {
    type : String,
    default : 'Normal',
    enum : ['Normal', 'Instant']
  },
  title:String,
  file:String,
  awsFileUrl:String,
  fileType:String,
  type:{
    type:Number,
    ref:'SuggestionType'
  },
  category:{
    type:Number,
    ref:'Category'
  },
  productUrl:String,
  caption:String,
  location:String,
  googleLocationId:String,
  toSuggestthat:Number,
  thumbNail:String,
  awsThumbnailUrl:String,
  awsMinithumbUrl:String,
  lat:String,
  long:String,
  social:Number,
  postedBy:{
    type:Number,
    ref:'User'
  },
  createdAt:{
    type:Date,
    default:Date.now
  },
  updatedAt:{
    type:Date,
    default:Date.now
  }
});

SuggestionSchema.plugin(autoIncrement.plugin,{
  model: 'Suggestion',
  field: '_id',
  startAt: 3959,
  incrementBy:1
});

module.exports = connection.model('Suggestion', SuggestionSchema);
module.exports = mongoose.model('Suggestion', SuggestionSchema);