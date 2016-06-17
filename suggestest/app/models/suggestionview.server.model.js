'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
    var connection = mongoose.createConnection(config.database.url);
    autoIncrement.initialize(connection);

//All Category  fields are defined 
var SuggestionViewSchema = new Schema({
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

SuggestionViewSchema.plugin(autoIncrement.plugin,{
  model: 'SuggestionView',
  field: '_id',
  startAt: 3956,
  incrementBy:1
});

module.exports = connection.model('SuggestionView', SuggestionViewSchema);
module.exports = mongoose.model('SuggestionView', SuggestionViewSchema);