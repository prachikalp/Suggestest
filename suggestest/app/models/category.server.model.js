'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
	autoIncrement = require('mongoose-auto-increment');
	var config  = require('../../config/config');
	var connection = mongoose.createConnection(config.database.url);
	autoIncrement.initialize(connection);

//All Category  fields are defined 
var CategorySchema = new Schema({
    title:String,
});

CategorySchema.plugin(autoIncrement.plugin,{
	model: 'Category',
    field: '_id',
    startAt: 5,
    incrementBy:1
});

module.exports = connection.model('Category', CategorySchema);
module.exports = mongoose.model('Category', CategorySchema);
