'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
    var connection = mongoose.createConnection(config.database.url);
    autoIncrement.initialize(connection);

//All Category  fields are defined 
var SuggestionCommentSchema = new Schema({
    suggestionId:{
        type:Number,
        ref:'Suggestion'
    },
    userId:{
        type:Number,
        ref:'User'
    },
    comments:String,
    createdDate:{
        type:Date,
        //default:Date.now
    },
    lastAlertviewed:{
        type:String,
        default:'0000-00-00 00:00:00'
    }
});

SuggestionCommentSchema.plugin(autoIncrement.plugin,{
  model: 'SuggestionComment',
  field: '_id',
  startAt: 2131,
  incrementBy:1
});

module.exports = connection.model('SuggestionComment', SuggestionCommentSchema);
module.exports = mongoose.model('SuggestionComment', SuggestionCommentSchema);