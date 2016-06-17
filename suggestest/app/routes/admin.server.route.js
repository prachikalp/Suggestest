'use strict';

var adminController = require('../controllers/admin.server.controller');

module.exports = function(app) {


  app.route('/api/admin/services/action=users')
    .get(adminController.getUsers);   

  app.route('/api/admin/services/action=userstatus')
	.post(adminController.userstatus);   
  

};