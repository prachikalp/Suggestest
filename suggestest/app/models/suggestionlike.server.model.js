'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
    var connection = mongoose.createConnection(config.database.url);
    autoIncrement.initialize(connection);

//All Category  fields are defined 
var SuggestionLikeSchema = new Schema({
    suggestionId:{
    	type:Number,
    	ref:'Suggestion'
    },
    userId:{
    	type:Number,
    	ref:'User'
    },
    createdDate:{
    	type:Date,
        default:Date.now
    },
    lastAlertviewed:{
    	type:String,
        default:'0000-00-00 00:00:00'
    }
});

SuggestionLikeSchema.plugin(autoIncrement.plugin,{
  model: 'SuggestionLike',
  field: '_id',
  startAt: 3955,
  incrementBy:1
});

module.exports = connection.model('SuggestionLike', SuggestionLikeSchema);
module.exports = mongoose.model('SuggestionLike', SuggestionLikeSchema);