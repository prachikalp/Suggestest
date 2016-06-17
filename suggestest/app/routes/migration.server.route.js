'use strict';

var userController = require('../controllers/users_migration.server.controller');

module.exports = function(app) {


  app.route('/api/services/action=usersmigration')
    .get(userController.usersmigration);
    
  app.route('/api/services/action=groupmigration')
    .get(userController.groupmigration);

  app.route('/api/services/action=groupcommentmigration')
    .get(userController.groupcommentmigration);

  app.route('/api/services/action=groupmembermigration')
    .get(userController.groupmembermigration);

  app.route('/api/services/action=suggestionsmigration')
    .get(userController.suggestionsmigration);
  
  app.route('/api/services/action=suggestcommentmigration')
    .get(userController.suggestcommentmigration);

  app.route('/api/services/action=suggestionlikemigration')
    .get(userController.suggestionlikemigration);

  app.route('/api/services/action=suggestionmapmigration')
    .get(userController.suggestionmapmigration);

  app.route('/api/services/action=suggestionreportmigration')
    .get(userController.suggestionreportmigration);

  app.route('/api/services/action=suggestionviewmigration')
    .get(userController.suggestionviewmigration);

  app.route('/api/services/action=suggestiontypemigration')
    .get(userController.suggestiontypemigration);

  app.route('/api/services/action=requestmigration')
    .get(userController.requestmigration);

  app.route('/api/services/action=categorymigration')
    .get(userController.categorymigration);    


};