'use strict';

//For development enviornment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

var config = require('./config/config');

//Connect Database definef in config/development.js
var mongoose = require('mongoose');

 mongoose.connect(config.database.url, function(err) {
	  if (err) {
	    console.error('Could not connect to MongoDB!');
	  }
	    console.log(process.env.NODE_ENV  + ' Connected to database '+ config.database.url);
	});


var app = require('./config/express')();

//Listen port address defined in config/development.js
app.listen(config.port);


exports = module.exports = app;

console.log('Suggestthat application started on port ' + config.port);