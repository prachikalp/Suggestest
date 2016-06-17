'use strict';

var User       = require('../models/user.server.model'),
    fs         = require('fs'),
    fse        = require('fs-extra'),
    path       = require('path'),
    jwt        = require('jwt-simple'),
    config     = require('../../config/config'),
    base64     = require('base-64'),
    utf8       = require('utf8'), 
    moment     = require('moment'),
    general	   = require('../helpers/general'),
    Cmessage   = require('../helpers/common'),  // added common.js file
    awsSdk     = require('../../config/aws-sdk'), //Include aws file for uploading in s3 bucket
    sendgrid   = require('sendgrid')(config.sendgrid.username, config.sendgrid.password); 



exports.getUsers = function(req,res){
  
  User.find()
     .exec(function(error,users){
        
        if(error)
        {
          return res.sendStatus(400);
        }    

        if(!error)
        {
          res.status(200).json({
            users: users,
            count : users.length 
          });  
        }        

     });
     
};

exports.userstatus = function(req,res){
  var user_id = req.body.user_id;
  var isActive = req.body.isActive;

  User.findOne({_id:user_id},function(err,updUserData){
    if(err){
      return res.sendStatus(400);
    }

    if(updUserData)
    {
      updUserData.isActive = isActive;      
      updUserData.save(function(err,updated){
          if(err){
            return res.sendStatus(400);
          }
          if(updated){
            res.status(200).json({
              message:'User status changed successfully',
              status:true
            }); 
          }
      });
    }else{
      res.status(200).json({
        message:'User Not Found',
        status:false
      });
    }            

  }); //End User Data

};
