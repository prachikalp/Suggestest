'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    autoIncrement = require('mongoose-auto-increment');
    var config  = require('../../config/config');
	var connection = mongoose.createConnection(config.database.url);
	autoIncrement.initialize(connection);

//All Category  fields are defined 
var suggestionTypeSchema = new Schema({
 	catId:{
		type:Number,
		ref:'Category'
 	},
 	name:String,
 	apiType:String   
});

suggestionTypeSchema.plugin(autoIncrement.plugin,{
	model: 'SuggestionType',
    field: '_id',
    startAt: 143,
    incrementBy:1
});

module.exports = connection.model('SuggestionType', suggestionTypeSchema);
module.exports = mongoose.model('SuggestionType', suggestionTypeSchema);