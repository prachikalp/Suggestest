'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
    var connection = mongoose.createConnection(config.database.url);
    autoIncrement.initialize(connection);

//All Category  fields are defined 
var SuggestionReportSchema = new Schema({
    suggestionId:{
    	type:Number,
    	ref:'Suggestion'
    },
    reportedId:{
    	type:Number,
    	ref:'User'
    },
    reportFlag:Number,
    reportedTime:String
});

SuggestionReportSchema.plugin(autoIncrement.plugin,{
  model: 'SuggestionReport',
  field: '_id',
  startAt: 3542,
  incrementBy:1
});

module.exports = connection.model('SuggestionReport', SuggestionReportSchema);
module.exports = mongoose.model('SuggestionReport', SuggestionReportSchema);