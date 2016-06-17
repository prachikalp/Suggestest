'use strict';

var Suggestion    = require('../models/suggestion.server.model'),
    SuggestionMap = require('../models/suggestionmap.server.model'),
    SuggestionReport = require('../models/suggestionreport.server.model'),
    Category     = require('../models/category.server.model'),
    SuggesstionType     = require('../models/suggestiontype.server.model'),
    SuggestionLike    = require('../models/suggestionlike.server.model'),
    Request          = require('../models/request.server.model'),
    SuggestionComment = require('../models/suggestioncomment.server.model'),
    SuggestionView    = require('../models/suggestionview.server.model'),
    Group = require('../models/group.server.model'),
    GroupMember = require('../models/groupmember.server.model'),
    GroupComment = require('../models/groupcomment.server.model'),
    User       = require('../models/user.server.model'),
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

    var mysql      = require('mysql');
    var connection = mysql.createConnection({
      host     : 'localhost',
      user     : 'suggesthat',
      password : 'JQXA4myGPpBxcEUG',
      database : 'suggesthat'
    });

    connection.connect();

//5th Api registration
exports.usersmigration = function(req,res){

  // User Birthdate Format In Node DD/MM/YY

  connection.query('SELECT * from users', function(err, rows, fields) {
    if (!err)
    {
      rows.forEach(function(row){
        
        var created_at = moment(row.CreatedDate).format('YYYY/MM/DD mm:HH:ss');
        var updated_at = moment(row.UpdatedDate).format('YYYY/MM/DD mm:HH:ss');

        created_at = (created_at == 'Invalid date') ? '' : created_at;
        updated_at = (updated_at == 'Invalid date') ? '' : updated_at;

        if(row.BirthDate)
        {
          var DOB = moment(row.BirthDate).format('DD/MM/YYYY');
          if(DOB == 'Invalid date')
          {
            DOB = '';            
          }                  
        }else{
          var DOB = '';
        }

        var UserId = row.UserId;
        var Email = row.Email;
        var Countrycode = row.Countrycode;
        var Phone = row.Phone;
        var UserName = row.UserName;
        var Password = row.Password;
        var Photo = (row.Photo) ? row.Photo : '';
        var Fblogin = row.Fblogin;
        var CreatedDate = row.created_at;
        var UpdatedDate = row.updated_at;
        var isactive = row.isactive;
        var token = row.token;
        var device_type = row.device_type;

        var newUser = new User();
            newUser._id = UserId;
            newUser.email = Email;
            newUser.phone = Phone;
            newUser.birthDate = DOB;
            newUser.userName = UserName;            
            newUser.userPassword = Password;
            newUser.isActive = isactive;
            newUser.token = token;
            newUser.countryCode = Countrycode;
            newUser.photo = Photo;
            newUser.fbLogin =Fblogin; 
            newUser.createdDate = created_at;
            newUser.updatedDate = updated_at;
            if(device_type)
            {
              newUser.deviceType = device_type;  
            }
            
            newUser.CreatedDate = CreatedDate;
            newUser.UpdatedDate = UpdatedDate;


            newUser.save(function(err,newinsertUser){
              if(err){             
                return res.sendStatus(400);
              }
            });

      });

      res.status(200).json({
        Users:''
      });

    }else{
      console.log('Error while performing Query.');
    }
  });

};

exports.groupmigration = function(req,res){

  // "createdAt" : "2016-04-20 09:03:47",
  //id, group_name, category, type, location, group_image, aws_image_url, group_description, created_by, created_at, deleted

  connection.query('SELECT * FROM suggesthat.`group`', function(err, rows, fields) {
    console.log(err);
    if (!err)
    {
      var suggestionsArray = [];
      rows.forEach(function(row){

        //var created_at = moment(row.created_at).format('YYYY-MM-DD HH:mm:ss');
        //created_at = (created_at == 'Invalid date') ? '0000-00-00 00:00:00' : created_at;

        var id = row.id;
        var group_name = row.group_name;
        var category = row.category;
        var type = row.type;
        var location = row.location;
        var group_image = row.group_image;
        var aws_image_url = row.aws_image_url;
        var group_description = row.group_description;
        var created_by = row.created_by;        
        var deleted = row.deleted;

        var newGroup = new Group();
            newGroup._id = id;  
            newGroup.groupName = group_name;
            newGroup.category = category;
            newGroup.type =  type;
            newGroup.location =  location;
            newGroup.groupImage = group_image;
            newGroup.awsImageUrl = aws_image_url;
            newGroup.groupDescription = group_description;
            newGroup.createdBy = created_by;
            newGroup.createdAt = row.created_at;            
            newGroup.deleted = deleted;
            newGroup.save(function(err,insertGroup){
                if(err){                  
                  return res.sendStatus(400);
                }
            });


      });

      res.status(200).json({
        NormalSuggesion:suggestionsArray
      });
    }  
  });
};


exports.groupcommentmigration = function(req,res){

  //"createdAt" : "2016-04-19 15:40:28"
  //YY-MM-DD
  //id, group_id, comments, created_by, created_at, deleted

  connection.query('SELECT * from group_comments', function(err, rows, fields) {
    if (!err)
    {
      var suggestionsArray = [];
      rows.forEach(function(row){

        //var created_at = moment(row.created_at).format('YYYY-MM-DD HH:mm:ss');        
        //created_at = (created_at == 'Invalid date') ? '0000-00-00 00:00:00' : created_at;
        
        var id = row.id;
        var group_id = row.group_id;
        var comments = row.comments;
        var created_by = row.created_by;
        
        var deleted = row.deleted;

        var newGroupComment = new GroupComment();
            newGroupComment._id = id;
            newGroupComment.groupId = group_id;
            newGroupComment.comments = comments;
            newGroupComment.createdBy = created_by;
            newGroupComment.createdAt = row.created_at;
            newGroupComment.save(function(err,insertGroupComment){
              if(err){
                //return res.sendStatus(400);
              }
            });

      });

      res.status(200).json({
        NormalSuggesion:suggestionsArray
      });

    }  
  });
};

exports.groupmembermigration = function(req,res){

  //"createdAt" : "2016-04-20 09:05:03"
  //id, group_id, from_user_id, to_user_id, created_at, status  

  connection.query('SELECT * from group_members', function(err, rows, fields) {
    if (!err)
    {
      var suggestionsArray = [];
      rows.forEach(function(row){

        //var created_at = moment(row.created_at).format('YYYY-MM-DD HH:mm:ss');
        //created_at = (created_at == 'Invalid date') ? '0000-00-00 00:00:00' : created_at;
        
        var id = row.id;
        var group_id = row.group_id;
        var from_user_id = row.from_user_id;
        var to_user_id = row.to_user_id;
        var status = row.status;

        var newGroupMember = new GroupMember();
            newGroupMember._id = id;
            newGroupMember.groupId = group_id;
            newGroupMember.fromUserId = from_user_id;
            newGroupMember.toUserId = to_user_id;
            newGroupMember.createdAt = row.created_at;
            newGroupMember.save(function(err,groupMemberId){
              if(err){
                return res.sendStatus(400);
              }
              if(groupMemberId){

              }
            });

      });

      res.status(200).json({
        GroupMember:suggestionsArray
      });
    }

  });

};


exports.suggestionsmigration = function(req,res){

  //"createdAt" : ISODate("2016-04-20T07:25:31.593Z")
  //id, suggestion_type, title, file, aws_file_url, filetype, type, category, product_url, caption, location, google_location_id, toSuggestThat, thumbnail, aws_thumbnail_url, aws_minithumb_url, lat, long, social, posted_by, created_at, updated_at
  connection.query('SELECT * from suggestions', function(err, rows, fields) {
    if (!err)
    {
      var suggestionsArray = [];
      rows.forEach(function(row){

        var created_at = moment(row.created_at).format('YYYY-MM-DD HH:mm:ss');        
        var updated_at = moment(row.updated_at).format('YYYY-MM-DD HH:mm:ss');


        created_at = (created_at == 'Invalid date') ? '0000-00-00 00:00:00' : created_at;
        updated_at = (updated_at == 'Invalid date') ? '0000-00-00 00:00:00' : updated_at;        
        console.log(created_at);

        var id = row.id;
        var title = row.title;
        var suggestion_type = row.suggestion_type;
        var file = row.file;
        var aws_file_url = row.aws_file_url;
        var filetype = row.filetype;
        var type = row.type;
        var category = row.category;
        var product_url = row.product_url;
        var caption = row.caption;
        var location = row.location;
        var google_location_id = row.google_location_id;
        var toSuggestThat = row.toSuggestThat;
        var thumbnail = row.thumbnail;
        var aws_thumbnail_url = row.aws_thumbnail_url;
        var aws_minithumb_url = row.aws_minithumb_url;
        var lat = row.lat;
        var long = row.long;
        var social = row.social;
        var posted_by = row.posted_by;
        
        
          
        var newSuggestion = new Suggestion();
        newSuggestion._id = id;
        newSuggestion.title = title;
        newSuggestion.file = file;
        newSuggestion.awsFileUrl = aws_file_url;
        newSuggestion.fileType = filetype;
        newSuggestion.type = type;  //type Id
        newSuggestion.category = category; //category Id
        newSuggestion.productUrl = product_url;
        newSuggestion.caption = caption;
        newSuggestion.location = location;
        newSuggestion.googleLocationId = google_location_id;
        newSuggestion.toSuggestthat = toSuggestThat;
        newSuggestion.thumbNail = thumbnail;
        newSuggestion.awsThumbnailUrl = aws_thumbnail_url;
        newSuggestion.awsMinithumbUrl = aws_minithumb_url;
        newSuggestion.lat = lat;
        newSuggestion.long = long;
        newSuggestion.social = social;
        newSuggestion.postedBy = posted_by; // User Id
        newSuggestion.createdAt = created_at; // User Id
        newSuggestion.updatedAt = updated_at; // User Id
        newSuggestion.save(function(err,insertSuggestion){

          if(insertSuggestion)
          {
            suggestionsArray.push(insertSuggestion);
          }        
        
        });

      });

      res.status(200).json({
        NormalSuggesion:suggestionsArray
      });
    }  
  });

};

exports.suggestcommentmigration = function(req,res){

  //suggestcommentmigration
  //id, suggestion_id, user_id, comments, created_date, last_alert_viewed
  // "createdDate" : ISODate("2016-04-20T09:12:30Z")  
  //"lastAlertviewed" : "2016-04-20 09:46:14"

  connection.query('SELECT * from suggestions_comments', function(err, rows, fields) {
    if (!err)
    {
      var suggestionsArray = [];
      rows.forEach(function(row){

        var created_date = moment(row.created_date).format('YYYY-MM-DD HH:mm:ss');        
        var last_alert_viewed = moment(row.last_alert_viewed).format('YYYY-MM-DD HH:mm:ss');        
        created_date = (created_date == 'Invalid date') ? '' : created_date;
        last_alert_viewed = (last_alert_viewed == 'Invalid date') ? '0000-00-00 00:00:00' : last_alert_viewed;

        var id = row.id;
        var suggestion_id = row.suggestion_id;
        var user_id = row.user_id;
        var comments = row.comments;
       
        var newSuggestionComment = new SuggestionComment();
            newSuggestionComment._id = id;
            newSuggestionComment.suggestionId = suggestion_id;
            newSuggestionComment.userId = user_id;
            newSuggestionComment.comments = comments;
            newSuggestionComment.createdDate = created_date;          
            newSuggestionComment.lastAlertviewed = row.last_alert_viewed;
            
            newSuggestionComment.save(function(err,suggcoment){
              if(err){                
                //return res.sendStatus(400);
              }
              if(suggcoment){

              }
            });

      });

      res.status(200).json({
        NormalSuggesion:suggestionsArray
      });

    }
  });

};

exports.suggestionlikemigration = function(req,res){
  //"lastAlertviewed" : "2016-04-20 09:10:09"
  //"createdDate" : ISODate("2016-04-20T09:10:00Z")
  //suggestcommentmigration
  //suggestion_id, user_id, created_date, last_alert_viewed  

  connection.query('SELECT * from suggestions_likes', function(err, rows, fields) {
    if (!err)
    {
      var suggestionsArray = [];
      rows.forEach(function(row){

        var created_date = moment(row.created_date).format('YYYY-MM-DD HH:mm:ss');        
        var last_alert_viewed = moment(row.last_alert_viewed).format('YYYY-MM-DD HH:mm:ss');        
        created_date = (created_date == 'Invalid date') ? '0000-00-00 00:00:00' : created_date;
        last_alert_viewed = (last_alert_viewed == 'Invalid date') ? '0000-00-00 00:00:00' : last_alert_viewed;

        var suggestion_id = row.suggestion_id;
        var user_id = row.user_id;

        var newSuggestionLike = new SuggestionLike();
            newSuggestionLike.suggestionId = suggestion_id;
            newSuggestionLike.userId = user_id;
            newSuggestionLike.createdDate = created_date;
            newSuggestionLike.lastAlertviewed = row.last_alert_viewed;
            newSuggestionLike.save(function(err,insertsuggestionLike){
              if(err){
                return res.sendStatus(400);
              }
            });
               

      });

      res.status(200).json({
        NormalSuggesion:suggestionsArray
      });

    }
  });

};

exports.suggestionmapmigration = function(req,res){
  // "lastAlertViewed" : "2016-04-20 09:05:13"
  //suggestionmapmigration
  //suggestion_id, posted_to, reported, last_alert_viewed

  connection.query('SELECT * from suggestions_map', function(err, rows, fields) {
    if (!err)
    {
      var suggestionsArray = [];
      rows.forEach(function(row){

        //var last_alert_viewed = moment(row.last_alert_viewed).format('YYYY-MM-DD HH:mm:ss');        
        //last_alert_viewed = (last_alert_viewed == 'Invalid date') ? '0000-00-00 00:00:00' : last_alert_viewed;

        var suggestion_id = row.suggestion_id;
        var posted_to = row.posted_to;
        var reported = row.reported;

        var newSuggestionMap = new SuggestionMap();
            newSuggestionMap.suggestionId = suggestion_id;
            newSuggestionMap.postedTo = posted_to;
            newSuggestionMap.reported = reported;
            newSuggestionMap.lastAlertViewed = row.last_alert_viewed;
            newSuggestionMap.save(function(err,suggestionmap){
              if(err){
                return res.sendStatus(400);
              }
            });

      });      

      res.status(200).json({
        NormalSuggesion:suggestionsArray
      });

    }
  });

};


exports.suggestionreportmigration = function(req,res){
  // "reportedTime" : "2016-04-20 09:09:29"  
  //suggestionreportmigration
  //suggestion_id, reported_id, report_flag, reported_time

  connection.query('SELECT * from suggestions_report', function(err, rows, fields) {
    if (!err)
    {
      var suggestionsArray = [];
      rows.forEach(function(row){

      //  var reported_time = moment(row.reported_time).format('YYYY-MM-DD HH:mm:ss');        
      //  reported_time = (reported_time == 'Invalid date') ? '0000-00-00 00:00:00' : reported_time;

        var suggestion_id = row.suggestion_id;
        var reported_id = row.reported_id;
        var report_flag = row.report_flag;

         var newSuggestionReport = new SuggestionReport();
            newSuggestionReport.suggestionId = suggestion_id;
            newSuggestionReport.reportedId = reported_id;
            newSuggestionReport.reportFlag = report_flag;
            newSuggestionReport.reportedTime = row.reported_time;
            newSuggestionReport.save(function(err,insertReport){
              if(err){
             //   return res.sendStatus(400);
              }
              if(insertReport){

              }
            });

      });

      res.status(200).json({
        NormalSuggesion:suggestionsArray
      });

    }
  });

};


exports.suggestionviewmigration = function(req,res){
  //"lastAlertviewed" : "2016-04-20 09:11:02"
  // "createdDate" : ISODate("2016-04-20T09:09:11Z")
  //suggestionviewmigration
  //suggestion_id, user_id, created_date, last_alert_viewed

  connection.query('SELECT * from suggestions_views', function(err, rows, fields) {
    if (!err)
    {
      var suggestionsArray = [];
      rows.forEach(function(row){

        //var created_date = moment(row.created_date).format('YYYY-MM-DD HH:mm:ss');        
        //var last_alert_viewed = moment(row.last_alert_viewed).format('YYYY-MM-DD HH:mm:ss');        
        //created_date = (created_date == 'Invalid date') ? '0000-00-00 00:00:00' : created_date;
        //last_alert_viewed = (last_alert_viewed == 'Invalid date') ? '0000-00-00 00:00:00' : last_alert_viewed;

        var suggestion_id = row.suggestion_id;
        var user_id = row.user_id;
        

        var newSuggestionView = new SuggestionView();
            newSuggestionView.suggestionId = suggestion_id;
            newSuggestionView.userId = user_id;
            newSuggestionView.createdDate = row.created_date;
            newSuggestionView.lastAlertviewed = row.last_alert_viewed;
            newSuggestionView.save(function(err,insertsuggestionView){
              if(err){
                //return res.sendStatus(400);
              }
              if(insertsuggestionView){

              }
            });

      });      

      res.status(200).json({
        SuggestionView:suggestionsArray
      });

    }
  });

};


exports.suggestiontypemigration = function(req,res){

  //suggestiontypemigration
  //id, catid, name, api_type

  connection.query('SELECT * from suggestion_type', function(err, rows, fields) {
    if (!err)
    {
      var suggestionsArray = [];
      rows.forEach(function(row){

        var id = row.id;
        var catid = row.catid;
        var name = row.name;
        var api_type = row.api_type;
        
        var newSuggestionType = new SuggesstionType();
            newSuggestionType._id = id;
            newSuggestionType.catId = catid;
            newSuggestionType.name = name;
            newSuggestionType.apiType = api_type;
            newSuggestionType.save(function(err,insertsuggestionType){
              if(err){
               // return res.sendStatus(400);
              }
            });

      });      

      res.status(200).json({
        SuggestionView:suggestionsArray
      });

    }
  });

};


exports.requestmigration = function(req,res){

  //id, Request_From_Id, Request_To_Id, Requested_Message, Request_Type, Status, Requested_At, last_alert_viewed
  // "lastAlertViewed" : "0000-00-00 00:00:00",
  //"requestedAt" : "2016-04-20"

  connection.query('SELECT * from request', function(err, rows, fields) {
    if (!err)
    {      
      var suggestionsArray = [];
      rows.forEach(function(row){

        var last_alert_viewed = moment(row.last_alert_viewed).format('YYYY-MM-DD HH:mm:ss');        
        var Requested_At = moment(row.Requested_At).format('YYYY-MM-DD HH:mm:ss');                
      //  Requested_At = (Requested_At == 'Invalid date') ? '' : Requested_At;
      //  last_alert_viewed = (last_alert_viewed == 'Invalid date') ? '' : last_alert_viewed;

        var id = row.id;
        var Request_From_Id = row.Request_From_Id;
        var Request_To_Id = row.Request_To_Id;
        var Requested_Message = row.Requested_Message;
        var Request_Type = row.Request_Type;
        var Status = row.Status;
        //var Requested_At = row.Requested_At;
        //var last_alert_viewed = last_alert_viewed;        
        
        var newRequest = new Request();
        newRequest._id = id;
        newRequest.requestFromId = Request_From_Id;
        newRequest.requestToId = Request_To_Id;
        newRequest.requestedMessage = Requested_Message;
        newRequest.status = Status;
        newRequest.requestedAt = row.Requested_At;
        newRequest.lastAlertViewed = row.last_alert_viewed;
        newRequest.save(function(err,suggcoment){
          if(err){  
            console.log(err);              
            //return res.sendStatus(400);
          }
          if(suggcoment){
            console.log(suggcoment._id);
          }
        });



      });

      res.status(200).json({
        Request:suggestionsArray
      });

    }
  });

};

exports.categorymigration = function(req,res){

  //id, title

  connection.query('SELECT * from category', function(err, rows, fields) {
    if (!err)
    {      
      var suggestionsArray = [];
      rows.forEach(function(row){
        var id = row.id;
        var title = row.title;

        var newCategory = new Category();
        newCategory._id = id;
        newCategory.title = title;
        newCategory.save(function(err,insertCategory) {
           if(err){
           // return res.sendStatus(400);
          } 
        });

      });

      res.status(200).json({
        Request:suggestionsArray
      });

    }
  });

};