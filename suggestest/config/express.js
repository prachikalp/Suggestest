'use strict';

var express = require('express'),
    fs      = require('fs'),
    bodyParser = require('body-parser'),
    multer  = require('multer'),
    cors   = require("cors");  

module.exports = function() {

    var app = express();

    app.use(cors());

    
    app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
        extended: true
    })); 
    
    app.use(bodyParser.json());       // to support JSON-encoded bodies

 
    app.use(multer({                  // to support multipart-form data
      dest: './public/uploads/',
      limits: {
          fileSize: 1024 * 1024 * 100
      },
      onFileSizeLimit: function(file) {
          fs.unlinkSync('./public/uploads/' + file.path);
      }
    }));

    // Setting the app router and static folder
    app.use(express.static(__dirname + '/public'));
    
    //Log All the request here
    app.use(function(req, res, next) {
        // Put some preprocessing here.
        console.info(req.method + ' ' + req.url + ' body ' + JSON.stringify(req.body) + ' params ' + JSON.stringify(req.params));
        next();
    });


    require('../app/routes/services.server.routes.js')(app);
    require('../app/routes/admin.server.route.js')(app);
    //require('../app/routes/migration.server.route.js')(app);

    
    return app;
};