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
    GroupMember = require('../models/groupmember.server.model'),
    User       = require('../models/user.server.model'),
    fse = require('fs-extra'),
    fs= require('fs'),
    Cmessage   = require('../helpers/common'),  // added common.js file
    general = require('../helpers/general'),
    User       = require('../models/user.server.model'),
    moment = require('moment-timezone'),
    easyimg = require('easyimage'),
    path       = require('path'),
    config     = require('../../config/config'),
    apn        = require('apn'),
    gcm        = require('android-gcm'),
    awsSdk = require('../../config/aws-sdk'), //Include aws file for uploading in s3 bucket
    async          = require('async'),
    sendgrid   = require('sendgrid')(config.sendgrid.username, config.sendgrid.password),
    _             = require('lodash');

//fileshare path in response and push notification is left
//15th Api postsuggestion
exports.postSuggestion = function(req,res){
  var title = (req.body.title) ? req.body.title: '';
  var type = (req.body.type)?req.body.type:0;
  var category = (req.body.category)?req.body.category:0;
  var location = (req.body.location)? req.body.location.trim() : '';
  var locationaddSlash = location.replace(/'/g, "\\'");  // addslashes left in location
  var toSuggestThat = (req.body.toSuggestThat)?req.body.toSuggestThat:0;
  var posted_by = (req.body.posted_by)?req.body.posted_by.trim(): '';
  var posted_to = (req.body.posted_to)?req.body.posted_to.trim():'';
  var social = (req.body.social)?req.body.social.trim():0;
  var lat = (req.body.lat)?req.body.lat.trim(): '';
  var long = (req.body.long)?req.body.long.trim(): '';
  var product_url = (req.body.product_url)?req.body.product_url.trim():'';
  var google_location_id = (req.body.google_location_id)?req.body.google_location_id.trim():'';
  var caption = (req.body.caption)?req.body.caption.trim():'';
  var videoFile = req.files.videoFile;
  var thumbnail = req.files.thumbnail;
  var isEmailShare = (req.body.isEmailShare == '1') ? '1' : '0';
  var emailShareReceipent = (req.body.emailShareReceipent) ? req.body.emailShareReceipent : '';
  emailShareReceipent = emailShareReceipent.split('|');
    
  
  if(videoFile && thumbnail && toSuggestThat
    &&(toSuggestThat === '1' || toSuggestThat=== '0') && posted_by 
    && (toSuggestThat === '1' && posted_by) || (toSuggestThat === '0' && posted_to))
  {

    //fOR VIDEO,iMG AND aUDIO fILES
    var timestamp = new Date().getTime();

    //For video
    var ext1 = videoFile.extension;
    var videotimeext = timestamp+"."+ext1;
    var videoext = ext1;
    var videofile = timestamp +"_"+videoFile.originalname;
    var videopath = videoFile.path;

    //For thumbnail images
    var ext2 = thumbnail.extension;
    var thumbtimext = timestamp+"."+ext2;
    var thumbext = ext2;
    var thumbfile =  timestamp+"_"+thumbnail.originalname;
    var thumbpath = thumbnail.path;

    // AWS-S3 Video Upload
    if(fs.existsSync(videopath)){
      var aws_file_url = awsSdk.uploadAWSFile(videopath,0); //Upload section for amazon url is left
    }
    // End AWS-S3 Video Upload

    // AWS-S3 thumb Upload

    // End AWS-S3 thumb Upload
    if(fs.existsSync(thumbpath)){
      var aws_thumbnail_url = awsSdk.uploadAWSFile(thumbpath,0); 
    }
    // End AWS Video Image Move

    if(aws_thumbnail_url && aws_thumbnail_url!=0){
      //Start Image Resize thumbnail   
      easyimg.resize({
        src:thumbpath, dst:'public/uploads/thumbnail/'+thumbfile,
        width:270, height:270
      }).then(function(image) {
        var thumbnailpath =  'public/uploads/thumbnail/'+thumbfile;
        if(fs.existsSync(thumbnailpath)){
          
          var aws_mini_thumbnail_url = awsSdk.uploadAWSFile(thumbnailpath,1);
          
          fs.exists(videopath, function(exists) {
            fs.unlink(videopath);
          });
          
          fs.exists(thumbpath, function(exists) {
            fs.unlink(thumbpath);
          });
          //Image path of thumbnail file resized should be unlinked
          
          fs.exists(thumbnailpath, function(exists) {
            fs.unlink(thumbnailpath);
          });
        }
        
        var newSuggestion = new Suggestion();
        newSuggestion.title = title;
        newSuggestion.file = videofile;
        newSuggestion.awsFileUrl = aws_file_url;
        newSuggestion.fileType = videoext;
        newSuggestion.type = type;  //type Id
        newSuggestion.category = category; //category Id
        newSuggestion.productUrl = product_url;
        newSuggestion.caption = caption;
        newSuggestion.location = locationaddSlash;
        newSuggestion.googleLocationId = google_location_id;
        newSuggestion.toSuggestthat = toSuggestThat;
        newSuggestion.thumbNail = thumbfile;
        newSuggestion.awsThumbnailUrl = aws_thumbnail_url;
        newSuggestion.awsMinithumbUrl = aws_mini_thumbnail_url;
        newSuggestion.lat = lat;
        newSuggestion.long = long;
        newSuggestion.social = social;
        newSuggestion.postedBy = posted_by; // User Id
        newSuggestion.save(function(err,insertSuggestion){
          if(err){
            return res.sendStatus(400);
          }
          var suggestionId = insertSuggestion._id;

          if(suggestionId){  // If Suggestion Inserted 
            if(posted_to){
              if(posted_to.indexOf(',') >= 0)
              {
                  var posted_to_array = posted_to.split(',');
                  for (var i=0; i<posted_to_array.length;i++){ 
                    var value_posted_to = posted_to_array[i];
                    User.find({_id:value_posted_to},function(err,userData){
                      if(err){
                        return res.sendStatus(400);
                      }
                      if(userData){
                        userData.forEach(function(user){
                          var newSuggestionMap = new SuggestionMap();
                          newSuggestionMap.suggestionId = suggestionId;
                          newSuggestionMap.postedTo = user._id;
                          newSuggestionMap.save();
                        });
                      }
                    });
                  }
              }else{
                  var newSuggestionMap = new SuggestionMap();
                  newSuggestionMap.suggestionId = suggestionId;
                  newSuggestionMap.postedTo = posted_to;
                  newSuggestionMap.save();
              }
              //If posted_to exists insert Suggestion Map Data
            }

            //if(toSuggestThat == 1 && social ==1 && posted_to == '')
            if(posted_to == '')
            {
                Request.find({$and:[{requestToId:posted_by},{status:'accepted'}]}).populate('requestFromId').exec(function(err,requestData){
                  if(err){
                    return res.sendStatus(400);
                  }
                  if(requestData && requestData.length>0){

                    var MyFriends = [];

                    requestData.forEach(function(request){
                      var requestFrom_Id = request.requestFromId._id;

                      var newSuggestionMap = new SuggestionMap();
                          newSuggestionMap.suggestionId = suggestionId;
                          newSuggestionMap.postedTo = requestFrom_Id;
                          newSuggestionMap.save();
                      
                    });
                  }
                });
            }

              //Get Suggestion Data
              Suggestion.findOne({$and:[
                      {_id:suggestionId},
                      {suggestionType:'Normal'}
                    ]})
                    .populate('postedBy')
                    .populate('type')
                    .populate('category')
                    .exec(function(err,suggestionData){
                if(err){
                  return res.sendStatus(400);
                }
                if(suggestionData){
                    
                    
                    //fileshare field might be different                        
                    if(suggestionData.type && suggestionData.category){
                          var location = suggestionData.location.replace(/\\/g, '');
                          var title = suggestionData.title;
                          var caption = suggestionData.caption;
                          var awsFileUrl = (suggestionData.awsFileUrl)?suggestionData.awsFileUrl:'';
                          //var fileshare = config.baseUrl.url+"playsuggesthat.php?src="+awsFileUrl;
                          var fileshare = config.tinyurl.url+"?src="+suggestionData._id;
                          var type = (suggestionData.type.name)?suggestionData.type.name:'';
                          var category = (suggestionData.category.title)?suggestionData.category.title:'';
                          var awsThumbnailUrl = (suggestionData.awsThumbnailUrl)?suggestionData.awsThumbnailUrl:'';
                          var awsminiThumbPath = (suggestionData.awsMinithumbUrl)?suggestionData.awsMinithumbUrl:'';
                          var lat = suggestionData.lat;
                          var long = suggestionData.long; 
                          var toSuggestthat = suggestionData.toSuggestthat;
                          var userId = suggestionData.postedBy._id;
                          var userName = suggestionData.postedBy.userName;
                          var photo = (suggestionData.postedBy.photo)?suggestionData.postedBy.photo:'';
                          var productUrl = (suggestionData.productUrl)?suggestionData.productUrl:'';
                          var createdAt = moment(suggestionData.createdAt).format('YYYY-MM-DD');

                          if(isEmailShare == '1')
                          {                
                            emailShareReceipent.forEach(function(email_share){
                              //Read the html template file

                              if(email_share != '')
                              {
                                  var filePath = path.join(__dirname, '../helpers/mailTemplate/newsletter.html');
                                  var video_url = config.tinyurl.url+"?src="+insertSuggestion._id;
                                  //var video_url = config.baseUrl.url+"playsuggesthat.php?src="+insertSuggestion.awsFileUrl;
                    
                                  fs.readFile(filePath,'utf8',function (err, html){       
                                    html = html.replace("{{toname}}",'');
                                    html = html.replace("{{video_url}}",video_url);
                                    html = html.replace("{{thmbunail_url}}",awsThumbnailUrl);
                                    html = html.replace("{{fromname}}",userName);
                                    html = html.replace("{{category}}",category);
                                    html = html.replace("{{type}}",type);
                                    html = html.replace("{{location}}",location);
                                    
                                    
                                  
                                    //Sendgrid Mail Done
                                    var sendEmail = new sendgrid.Email();
                    
                                        
                                    sendEmail.setTos(email_share);
                                    sendEmail.setFrom(suggestionData.postedBy.email);
                                    sendEmail.setSubject('A special message from your friends at Suggesthat');
                                    sendEmail.setHtml(html); //added template html file
                                    
                                    sendgrid.send(sendEmail);
                                  });
                              }                    
                            });                
                          }

                          var suggestions = {
                                  'suggestionId':suggestionData._id.toString(),
                                  'title':title,
                                  'caption':caption,
                                  'file':awsFileUrl,
                                  'fileshare':fileshare,
                                  'type':type,
                                  'category':category,
                                  'thumbnail':awsThumbnailUrl,
                                  'thumb':awsminiThumbPath,
                                  'location':location,
                                  'lat':lat,
                                  'long':long,
                                  'reported':'0',
                                  'toSuggestThat':toSuggestthat.toString(),
                                  'UserId':userId.toString(),
                                  'UserName':userName,
                                  'Photo':photo,
                                  'product_url':productUrl,
                                  'created_at':createdAt,
                          };
                          
                          if(posted_to){
                            general.SuggestionPush(suggestionId,'Normal');                                
                          }
                      
                          res.status(200).json({
                            NormalSuggesion:suggestions,
                            message:Cmessage.suggestions.SENT,
                            SuggestionAck:Cmessage.condition.TRUE
                          });
                        
                      }else{
                      
                      var location = suggestionData.location.replace(/\\/g, '');
                      var title = suggestionData.title;
                      var caption = suggestionData.caption;
                      var awsFileUrl = (suggestionData.awsFileUrl)?suggestionData.awsFileUrl:'';
                      //var fileshare = config.baseUrl.url+"playsuggesthat.php?src="+awsFileUrl;
                      var fileshare = config.tinyurl.url+"?src="+suggestionData._id;
                      var type = (suggestionData.type.name)?suggestionData.type.name:'';
                      var category = (suggestionData.category.title)?suggestionData.category.title:'';
                      var awsThumbnailUrl = (suggestionData.awsThumbnailUrl)?suggestionData.awsThumbnailUrl:'';
                      var awsminiThumbPath = (suggestionData.awsMinithumbUrl)?suggestionData.awsMinithumbUrl:'';
                      var lat = suggestionData.lat;
                      var long = suggestionData.long; 
                      var toSuggestthat = suggestionData.toSuggestthat;
                      var userId = suggestionData.postedBy._id;
                      var userName = suggestionData.postedBy.userName;
                      var photo = (suggestionData.postedBy.photo)?suggestionData.postedBy.photo:'';
                      var productUrl = (suggestionData.productUrl)?suggestionData.productUrl:'';
                      var createdAt = moment(suggestionData.createdAt).format('YYYY-MM-DD');
                        
                        var suggestions = {
                                'suggestionId': suggestionData._id.toString(),
                                'title': title,
                                'caption':caption,
                                'file':awsFileUrl,
                                'fileshare':fileshare,
                                'type':'',
                                'category':'',
                                'thumbnail':awsThumbnailUrl,
                                'thumb':awsminiThumbPath,
                                'location':location,
                                'lat':lat,
                                'long':long,
                                'reported':'0',
                                'toSuggestThat':toSuggestthat.toString(),
                                'UserId':userId.toString(),
                                'UserName':userName,
                                'Photo':photo,
                                'product_url':productUrl,
                                'created_at': createdAt,
                        }; 

                        res.status(200).json({
                          NormalSuggesion:suggestions,
                          message:Cmessage.suggestions.SENT,
                          SuggestionAck:Cmessage.condition.TRUE
                        });

                        if(posted_to){
                          general.SuggestionPush(suggestionId,'Normal');
                        }
                      }
                }
            
              }); //End Suggestion Data
          }else{     
            //If suggestion Id is not inserted             
            res.status(200).json({
              message:Cmessage.suggestions.NOT_SENT,
              SuggestionAck:Cmessage.condition.TRUE
            });
          }
        }); //End Insert Suggestion Data

      },function(err){

      });
      //End Image Resize thumbnail   
    }else{
      res.status(200).json({
        message:Cmessage.suggestions.NOT_SENT,
        SuggestionAck:Cmessage.condition.FALSE
      });
    }

  }else{
    res.status(200).json({
      message:Cmessage.parameters.MESSAGE,
      SuggestionAck:Cmessage.condition.FALSE
    });
  }
  
};

//16th Api postinstantsuggestion
exports.postInstantSuggestion = function (req,res) {
  var title = (req.body.title) ? req.body.title : '';
  var type = (req.body.type)?req.body.type:0;
  var category = (req.body.category)?req.body.category:0;
  var location = (req.body.location)? req.body.location:''; 
  var locationaddSlash = location.replace(/'/g, "\\'");  // addslashes left in location
  var toSuggestThat = (req.body.toSuggestThat)?req.body.toSuggestThat:0;
  var posted_by = (req.body.posted_by)?req.body.posted_by: '';
  var posted_to = (req.body.posted_to)?req.body.posted_to:'';
  var social = (req.body.social)?req.body.social:0;
  var lat = (req.body.lat)?req.body.lat.trim(): '';
  var long = (req.body.long)?req.body.long.trim(): '';
  var product_url = (req.body.product_url)?req.body.product_url.trim():'';
  var google_location_id = (req.body.google_location_id)?req.body.google_location_id.trim():'';
  var caption = (req.body.caption)?req.body.caption.trim():'';
  var videoFile = req.files.videoFile;
  var thumbnail = req.files.thumbnail;

   if(videoFile && thumbnail && toSuggestThat
    &&(toSuggestThat === '1' || toSuggestThat=== '0') && posted_by 
    && (toSuggestThat === '1' && posted_by) || (toSuggestThat === '0' && posted_to))
  {

    //fOR VIDEO,iMG AND aUDIO fILES
    var timestamp = new Date().getTime();
    var ext1 = videoFile.extension;

    var videotimeext = timestamp+"."+ext1;
    var videoext = ext1;
    var videofile = timestamp +"_"+videoFile.originalname;
    var videopath = videoFile.path;

    //For thumbnail images
    var ext2 = thumbnail.extension;
    var thumbtimext = timestamp+"."+ext2;
    var thumbext = ext2;
    var thumbfile =  timestamp+"_"+thumbnail.originalname;
    var thumbpath = thumbnail.path;

    // AWS-S3 Video Upload
    if(fs.existsSync(videopath)){
      var aws_file_url = awsSdk.uploadAWSFile(videopath,0); //Upload section for amazon url is left
    }
    // End AWS-S3 Video Upload

    // AWS-S3 thumbnail Upload
    if(fs.existsSync(thumbpath)){
      var aws_thumbnail_url = awsSdk.uploadAWSFile(thumbpath,0); 
    }
    // End AWS-S3 thumbnail Upload

    if(aws_thumbnail_url && aws_thumbnail_url!=0){
      //Start Image Resize thumbnail  
      easyimg.resize({
         src:thumbpath, dst:'public/uploads/thumbnail/'+thumbfile,
         width:270, height:270
      }).then(function(image){
        
        var thumbnailpath =  'public/uploads/thumbnail/'+thumbfile;
        if(fs.existsSync(thumbnailpath)){
          var aws_mini_thumbnail_url = awsSdk.uploadAWSFile(thumbnailpath,1);
          
          // Unlink Image
          fs.exists(videopath, function(exists) {
            fs.unlink(videopath);
          });
         
          fs.exists(thumbpath, function(exists) {
            fs.unlink(thumbpath);
          });
          //Image path of thumbnail file resized should be unlinked
          fs.exists(thumbnailpath, function(exists) {
            fs.unlink(thumbnailpath);
          });
          // End Unlink Image
        }

        var newSuggestion = new Suggestion();
        newSuggestion.title = title;
        newSuggestion.suggestionType = "Instant";
        newSuggestion.file = videofile;
        newSuggestion.awsFileUrl = aws_file_url;
        newSuggestion.fileType = videoext;
        newSuggestion.type = type;
        newSuggestion.category = category; //category Id
        newSuggestion.productUrl = product_url;
        newSuggestion.caption = caption;
        newSuggestion.location = locationaddSlash;
        newSuggestion.googleLocationId = google_location_id;
        newSuggestion.toSuggestthat = toSuggestThat;
        newSuggestion.thumbNail = thumbfile;
        newSuggestion.awsThumbnailUrl = aws_thumbnail_url;
        newSuggestion.awsMinithumbUrl = aws_mini_thumbnail_url;
        newSuggestion.lat = lat;
        newSuggestion.long = long;
        newSuggestion.social = social;
        newSuggestion.postedBy = posted_by; // User Id
        newSuggestion.save(function(err,insertSuggestion){
          if(err){
            return res.sendStatus(400);
          }
          var suggestionId = insertSuggestion._id;
          if(suggestionId){
            if(posted_to){
              if(toSuggestThat === '1'){       // If suggestThat is equal to 1
                User.find( { _id: { $ne: posted_by } },function(err,userData){
                    if(err){
                      return res.sendStatus(400);
                    }
                    if(userData){
                      for(var i=0;i<userData.length;i++){
                        var newSuggestionMap = new SuggestionMap();
                          newSuggestionMap.suggestionId = suggestionId;
                          newSuggestionMap.postedTo = userData[i]._id;
                          newSuggestionMap.save();
                      }          
                    }
                });
              }else{
              var posted_to_array = posted_to.split(',');
                for (var i=0; i<posted_to_array.length;i++){ 
                  var value_posted_to = posted_to_array[i];
                  User.find({_id:value_posted_to},function(err,userData){
                    if(err){
                      return res.sendStatus(400);
                    }
                    if(userData){
                      userData.forEach(function(user){
                        var newSuggestionMap = new SuggestionMap();
                        newSuggestionMap.suggestionId = suggestionId;
                        newSuggestionMap.postedTo = user._id;
                        newSuggestionMap.save();
                      });
                    }
                  });
                }
              }
            } 
            if(insertSuggestion){
            var location = insertSuggestion.location.replace(/\\/g, '');                                                                             
               
            var suggestions = {
                              'suggestionId':insertSuggestion._id,
                              'title':title,
                              'caption':caption,
                              'file':(insertSuggestion.awsFileUrl)?insertSuggestion.awsFileUrl:'',
                              'fileshare':(insertSuggestion.awsFileUrl)?insertSuggestion.awsFileUrl:'',
                              'type':type,
                              'category': category,
                              'thumbnail':(insertSuggestion.awsThumbnailUrl)?insertSuggestion.awsThumbnailUrl:'',
                              'minithumb':(insertSuggestion.awsMinithumbUrl)?insertSuggestion.awsMinithumbUrl:'',
                              'location':location,
                              'lat':insertSuggestion.lat,
                              'long':insertSuggestion.long,
                              'reported':0,
                              'toSuggestThat':insertSuggestion.toSuggestthat.toString(),                                                                        
                              'product_url':(insertSuggestion.productUrl)?insertSuggestion.productUrl:'',
                              'created_at':moment(insertSuggestion.createdAt).format('YYYY-MM-DD')
                            };
            }

            if(posted_to){
             general.SuggestionPush(suggestionId,'Instant',function(results){                    
              });
            }

            res.status(200).json({
              InstantSuggesion:suggestions,
              message:Cmessage.suggestions.SENT,
              SuggestionAck:Cmessage.condition.TRUE
            });

            
          }else{
            res.status(200).json({
              message:Cmessage.suggestions.NOT_SENT,
              SuggestionAck:Cmessage.condition.FALSE
            });
          }
        });        

      },function (err) {
        console.log(err);
      });
      //End Image Resize thumbnail  
    }else{
      res.status(200).json({
        message:Cmessage.suggestions.NOT_SENT,
        SuggestionAck:Cmessage.condition.FALSE
      });
    }

  }else{
    res.status(200).json({
        message:Cmessage.parameters.MESSAGE,
        SuggestionAck:Cmessage.condition.FALSE
    });
  }
};

//17th Api view myfriendSuggestions
exports.viewmyfriendSuggestions = function(req,res){
  var loginid = (req.body.loginid)?req.body.loginid.trim():'';
  var timezone = (req.body.timezone)?req.body.timezone.trim():'+00:00';
  //http://tinyurl.com/gq5tn3t   tiny-url

  if(timezone.indexOf('\\') > -1)
  {
    timezone = timezone.replace(/\\/g, '');  
  }

  var start = (req.body.start)?req.body.start:0;
  var count = (req.body.count)?req.body.count:10;
  start = parseInt(start);
  count = parseInt(count);
  if(loginid && loginid!== '' && timezone && timezone!==''){
    
    // Start Main Async Parallel
    async.parallel([
        function(callback){
          // Start Get Suggestion
          Suggestion.find({$and:[
            {suggestionType:'Normal'},
            {postedBy:loginid}
          ]})
            .populate('postedBy')
            .populate('type')
            .populate('category')
            .sort({createdAt:1})
            //.skip(start).limit(count)
            .exec(function(err,suggestions){
              if(err){
                callback(err);                            
              }else{
                callback(null,suggestions);  
              }              
          
          });
          // Start Get Suggestion
            
        },
        function(callback){

          SuggestionMap.find({postedTo:loginid}).select('suggestionId').exec(function(err,suggestionmapData){
              if(err){            
                return res.sendStatus(400);
              }
              
              if(suggestionmapData && suggestionmapData.length > 0)
              {
                var suggestionids = [];
                suggestionmapData.forEach(function(sm){
                  suggestionids.push(sm.suggestionId);
                });                  

                // Start Get Suggestion
                Suggestion.find({$and:[
                  {suggestionType:'Normal'},
                  {_id:{$in:suggestionids}}
                ]})
                  .populate('postedBy')
                  .populate('type')
                  .populate('category')
                  .sort({createdAt:1})
                  //.skip(start).limit(count)
                  .exec(function(err,suggestions){
                    if(err){
                      callback(err);                            
                    }else{
                      callback(null,suggestions);  
                    }                    
                
                });
                // Start Get Suggestion
              }else{
                callback();
              }
              
          });
            
        }
    ],
    // optional callback
    function(err, results){
      if(err){
        return res.sendStatus(400);
      }

      var suggestions = [];
      if(results && results.length > 0)
      {
        results.forEach(function(result){

          if(result && result.length > 0)
          {            
            result.forEach(function(r){
              suggestions.push(r);
            });    
          }
        });        
      }

      var suggestionData = [];
      async.each(suggestions,function(suggestion,asyncCallback){
        var suggestion_id = suggestion._id

        // Start suggestionreportData
        SuggestionReport.find({$and:[
          {reportedId:loginid},
          {suggestionId:suggestion_id}
        ]})
        .exec(function(err,suggestionreportData){
          if(err){            
            return asyncCallback(err); 
          }
           //Start suggviewCount
          SuggestionView.find({suggestionId:suggestion_id}).count().exec(function(err,suggviewCount){
            if(err){
              return asyncCallback(err); 
            }
            // Start Suggestion Like User Count
            SuggestionView.find({$and:[
                  {suggestionId:suggestion_id},
                  {userId:loginid}
                ]}).count().exec(function(err,suggviewuserCount){
              if(err){                     
                return asyncCallback(err); 
              }
          // Start sugglikeCount
          SuggestionLike.find({suggestionId:suggestion_id}).count().exec(function(err,sugglikeCount){
            if(err){
              return asyncCallback(err); 
            }
            // Start Suggestion Like User Count
            SuggestionLike.find({$and:[
                  {suggestionId:suggestion_id},
                  {userId:loginid}
                ]}).count().exec(function(err,sugglikeuserCount){
              if(err){                     
                return asyncCallback(err); 
              }

              // Start Suggestion Comment Count
              SuggestionComment.find({suggestionId:suggestion_id}).count().exec(function(err,suggcommentCount){
                if(err){                    
                  return asyncCallback(err);  
                }

                // Start Suggestion Comment Data
                var commentList = [];

                SuggestionComment.find({suggestionId:suggestion_id})
                  .populate('suggestionId')
                  .populate('userId').limit(10)
                  .exec(function(err,suggcommentsData){
                    if(err){                        
                      return asyncCallback(err);  
                    }

                    if(suggcommentsData && suggcommentsData.length > 0)
                    {
                      suggcommentsData.forEach(function(suggcommentData){

                        var photo = (suggcommentData.userId.photo) ? suggcommentData.userId.photo : '';
                        commentList.push({
                            'comment_id':suggcommentData._id.toString(),
                            'created_date':moment(suggcommentData.createdDate).format('YYYY-MM-DD HH:mm:ss'),
                            'UserId':suggcommentData.userId._id.toString(),
                            'UserName':suggcommentData.userId.userName,
                            'Photo':photo,
                            'comments':suggcommentData.comments
                        });
                      });
                      
                      var recent_comments = commentList;                                                                            
                    }else{
                      var recent_comments = Cmessage.filtersuggestion.NO_COMMENT;
                    }

                    //Collect all the suggestions Data that are filtered instant
                    var count_likes = sugglikeCount;
                    var like_flag = sugglikeuserCount;
                    var count_views = suggviewCount;
                    var view_flag = suggviewuserCount;
                    var count_comments = suggcommentCount;
                    var aws_file_url = (suggestion.awsFileUrl)?suggestion.awsFileUrl:'';
                    var fileshare = config.tinyurl.url+"?src="+suggestion._id;
                    var category = (suggestion.category && suggestion.category.title)?(suggestion.category.title):'';
                    var type = (suggestion.type && suggestion.type.name)?(suggestion.type.name):'';
                    var thumbnail = (suggestion.awsThumbnailUrl)?suggestion.awsThumbnailUrl:'';
                    var thumb = (suggestion.awsMinithumbUrl)?suggestion.awsMinithumbUrl:'';
                    var reported = (suggestionreportData.reportFlag)?1:0;
                    var product_url = (suggestion.product_url)?suggestion.product_url:'';
                    var Photo = (suggestion.postedBy.photo)?suggestion.postedBy.photo:'';

                    var created_at = moment(suggestion.createdAt).tz(timezone).format('YYYY-MM-DD HH:mm:ss');                   
                    //var created_at = moment(suggestion.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD');

                   
                      suggestionData.push({
                      suggestionId:suggestion._id.toString(),
                      title:suggestion.title,
                      caption:suggestion.caption,
                      file:aws_file_url,
                      fileshare:fileshare,
                      type:type,
                      category:category,
                      thumbnail:thumbnail,
                      thumb:thumb,
                      location:suggestion.location,
                      lat:suggestion.lat,
                      long:suggestion.long,
                      reported:reported.toString(),
                      toSuggestThat:suggestion.toSuggestthat.toString(),
                      UserId:suggestion.postedBy._id.toString(),
                      UserName:suggestion.postedBy.userName,
                      product_url:product_url,
                      Photo:Photo,
                      created_at:created_at,
                      count_likes:count_likes.toString(),
                      like_flag:like_flag.toString(),
                      count_views:count_views.toString(),
                      view_flag:view_flag.toString(),
                      count_comments:count_comments.toString(),
                      recent_comments:recent_comments                        
                    });
                    asyncCallback();

                }); // End Suggestion Comment Data

              }); // End Suggestion Comment Count
            }); // End Suggestion Like User Count    
          }); // End sugglikeCount
          }); //End Suggestion View Count
          }); //End suggviewCount
        }); // End suggestionreportData
             
      },function(err){
        if(suggestionData.length > 0){
          
          suggestionData = suggestionData.sort(function(a, b) {
            var sortResult = new Date(b.created_at) - new Date(a.created_at);
            if (sortResult == 0) {
              return b.suggestionId - a.suggestionId;
            }
            return sortResult;
          });
          var totalrecord = suggestionData.length;
          count = start + count;
          suggestionData = suggestionData.slice(start,count);

          res.status(200).json({
            MyfriendsSuggestions:suggestionData,
            totalrecord:totalrecord,
            message:Cmessage.viewmyfriendssuggestion.SUGG_FOUND,
            FriendsSuggestionsAck:Cmessage.condition.TRUE
         });
        }else{
          res.status(200).json({
            message:Cmessage.viewmyfriendssuggestion.SUGG_NOT_FOUND,
            FriendsSuggestionsAck:Cmessage.condition.FALSE
          }); 
        }   
      });
      
    });
    // End Main Async Parallel
   
  }else{
    res.status(200).json({
      message:Cmessage.parameters.MESSAGE,
      FriendsSuggestionsAck:Cmessage.condition.FALSE
    });
  }
};

exports.friendSuggestion = function(req,res){
  var start = (req.body.start)?req.body.start:0;
  var count = (req.body.count)?req.body.count:10;
  start = parseInt(start);
  count = parseInt(count);
  var loginid = (req.body.loginid)?req.body.loginid:'';
  var friend_id = (req.body.friend_id)?req.body.friend_id:''; 
  var category = (req.body.category)?req.body.category:'';
  var type = (req.body.type)?req.body.type:'';
  var titlelocation = (req.body.titlelocation)?req.body.titlelocation:'';
  var timezone = (req.body.timezone)?req.body.timezone:'+00:00';

  if(timezone.indexOf('\\') > -1)
  {
    timezone = timezone.replace(/\\/g, '');  
  }


    if(loginid && loginid != "" && friend_id && friend_id != ""  && timezone && timezone!= ""){
        var condition = [];

        //condition.push({toSuggestthat:1});
        condition.push({postedBy:friend_id});

        if(category!=='' ){
          condition.push({category:category});
        }
        if(type!=='')
        {
          condition.push({type:type});
        }
        if(titlelocation!=='')
        {
          condition.push({location:{'$regex': titlelocation}});
        }

        Suggestion.find({$and:condition}) 
          .populate('postedBy')
          .populate('type')
          .populate('category')
          .sort({createdAt:1})
          .exec(function(err,suggestions){
            if(err){
              return res.sendStatus(400);
            }
        var suggestionData = [];
        async.each(suggestions,function(suggestion,asyncCallback){
          
           SuggestionMap.find({$and:[{suggestionId:suggestion._id},{postedTo:loginid}]},function(err,suggestionmapData){
              if(err){
                console.log(err);
              }
              if(suggestion || suggestionmapData){

              //Start suggviewCount
              SuggestionView.find({suggestionId:suggestion_id}).count().exec(function(err,suggviewCount){
                if(err){
                  return asyncCallback(err); 
                }
                // Start Suggestion Like User Count
                SuggestionView.find({$and:[
                      {suggestionId:suggestion_id},
                      {userId:loginid}
                    ]}).count().exec(function(err,suggviewuserCount){
                  if(err){                     
                    return asyncCallback(err); 
                  }
                    // Get Suggestion Like Count
                SuggestionLike.find({suggestionId:suggestion._id}).count().exec(function(err,sugglikeCount){
                  if(err){                     
                    return asyncCallback(err); 
                  }
                //Get Suggestion Like User Count
                SuggestionLike.find({$and:[
                      {suggestionId:suggestion._id},
                      {userId:loginid}
                    ]}).count().exec(function(err,sugglikeuserCount){
                  if(err){                     
                    return asyncCallback(err); 
                  }
                //Get Suggestion Comment Count
                 SuggestionComment.find({suggestionId:suggestion._id}).count().exec(function(err,suggcommentCount){
                    if(err){                      
                      return asyncCallback(err);  
                    }
                    //Get Suggestion Comment Data
                    var commentList = [];
                    SuggestionComment.find({suggestionId:suggestion._id})
                      .populate('suggestionId')
                      .populate('userId')
                      .limit(10)
                      .exec(function(err,suggcommentsData){
                        if(err){
                          console.log(err);
                          return asyncCallback(err);  
                        }
                        if(suggcommentsData && suggcommentsData.length > 0)
                        {
                          suggcommentsData.forEach(function(suggcommentData){
                            var photo = (suggcommentData.userId.photo)?suggcommentData.userId.photo : '';                            
                            commentList.push({
                                'comment_id':suggcommentData._id.toString(),
                                'created_date':moment(suggcommentData.createdDate).format('YYYY-MM-DD HH:mm:ss'),
                                'UserId':suggcommentData.userId._id.toString(),
                                'UserName':suggcommentData.userId.userName,
                                'Photo':photo,
                                'comments':suggcommentData.comments
                            });
                          });
                          
                          var recent_comments = commentList;                                                                            
                        }else{
                          var recent_comments = Cmessage.searchsuggestion.NO_COMMENT;
                        }

                      //Collect all the suggestions Data that are filtered instant
                      var count_likes = sugglikeCount;
                      var like_flag = sugglikeuserCount;
                      var count_views = suggviewCount;
                      var view_flag = suggviewuserCount;
                      var count_comments = suggcommentCount;
                      var aws_file_url = (suggestion.awsFileUrl)?suggestion.awsFileUrl:'';
                      var category = (suggestion.category && suggestion.category.title)?(suggestion.category.title):'';
                      var type = (suggestion.type && suggestion.type.name)?(suggestion.type.name):'';
                      var thumbnail = (suggestion.awsThumbnailUrl)?suggestion.awsThumbnailUrl:'';
                      var thumb = (suggestion.awsMinithumbUrl)?suggestion.awsMinithumbUrl:'';
                      var product_url = (suggestion.product_url)?suggestion.product_url:'';
                      var Photo = (suggestion.postedBy.photo)?suggestion.postedBy.photo:'';
                      //var created_at = moment(suggestion.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD');                      
                      var created_at = moment(suggestion.createdAt).tz(timezone).format('YYYY-MM-DD HH:mm:ss');


                      suggestionData.push({
                        'suggestionId':suggestion._id.toString(),
                        'title':suggestion.title,
                        'caption':suggestion.caption,
                        'file':aws_file_url,
                        'fileshare':aws_file_url,
                        'type':type,
                        'category':category,
                        'thumbnail':thumbnail,
                        'thumb':thumb,
                        'location':suggestion.location,
                        'lat':suggestion.lat,
                        'long':suggestion.long,
                        'reported':'0',
                        'toSuggestThat':suggestion.toSuggestthat.toString(),
                        'UserId':suggestion.postedBy._id.toString(),
                        'UserName':suggestion.postedBy.userName,
                        'product_url':product_url,
                        'Photo':Photo,
                        'created_at':created_at,
                        'count_likes':count_likes.toString(),
                        'like_flag':like_flag.toString(),
                        'count_views':count_views.toString(),
                        'view_flag':view_flag.toString(),
                        'count_comments':count_comments.toString(),
                        'recent_comments':recent_comments
                      });
                      asyncCallback();
                    }); //End Suggestion Comment data
                  }); //End Of suggestion comment Data
                }); //end Of Suggestion Like User Data
              }); //End Of suggestion Like Data
              }); //End Of Suggestion View User Data
              }); //End Of Suggestion View Data
              }else{
                asyncCallback();
              }
           }); //End Suggestion Map Data
        },function(err){
           if(suggestionData && suggestionData.length > 0){            
            
            suggestionData = suggestionData.sort(function(a, b) {
              var sortResult = new Date(b.created_at) - new Date(a.created_at);
              if (sortResult == 0) {
                return b.suggestionId - a.suggestionId;
              }
              return sortResult;
            });
            var totalrecord = suggestionData.length;
            count = start + count;
            suggestionData = suggestionData.slice(start,count);

            res.status(200).json({
              AllSuggestions:suggestionData,
              totalrecord:totalrecord,
              message:Cmessage.searchsuggestion.SUGG_FOUND,
              AllSuggestionsAck:Cmessage.condition.TRUE
            });
          }else{
            res.status(200).json({
              message:Cmessage.searchsuggestion.SUGG_NOT_FOUND,
              AllSuggestionsAck:Cmessage.condition.FALSE
            });
          }            
        });

      }); //end Of suggestion data 
    }else{
        res.status(200).json({
            message:Cmessage.parameters.MESSAGE,
            AllSuggestionsAck:Cmessage.condition.FALSE
        });
    }

};

//18th Api  filtersuggestion
exports.filterSuggestion = function(req,res){
  var loginid = (req.body.loginid)?req.body.loginid:'';
  var category = (req.body.category)?req.body.category:'';
  var type = (req.body.type)?req.body.type:'';
  var titlelocation = (req.body.titlelocation)?req.body.titlelocation:'';
  var isMyUpload = (req.body.isMyUpload)?req.body.isMyUpload:1;
  var frnd = (req.body.frnd)?req.body.frnd:'';
  var timezone = (req.body.timezone)?req.body.timezone:'+00:00';

  if(timezone.indexOf('\\') > -1)
  {
    timezone = timezone.replace(/\\/g, '');  
  }
  
  var start = (req.body.start)?req.body.start:0;
  var count = (req.body.count)?req.body.count:10;
  start = parseInt(start);
  count = parseInt(count);
  
  
  if(loginid && loginid!=='' && timezone && timezone!=='' && isMyUpload && (isMyUpload == 0 || isMyUpload == 1))
  {

     if(isMyUpload == 1){
        // Get Suggestion Data

        var condition = [];
        condition.push({suggestionType:'Normal'});
        if(category && category != '')
        {
          condition.push({category:category});
        }
        if(type && type != '')
        {
          condition.push({type:type});
        }
        if(titlelocation && titlelocation != '')
        {
          condition.push({location:{'$regex': titlelocation}});
        }
        condition.push({postedBy:loginid});

        Suggestion.find({$and:condition})
          .sort({createdAt:1})
          .populate('postedBy')
          .populate('type')
          .populate('category')          
          .exec(function(err,suggestions){
            if(err){
              return res.sendStatus(400);
            }
            
            var suggestionData = [];
            //For friend like suggestions
            //var frndlike = new RegExp(frnd);
            async.each(suggestions,function(suggestion,asyncCallback){
              var suggestion_id  = suggestion._id;
              var frndlike = (suggestion.postedBy.userName).search(frnd);
              if(frndlike > -1){                
                SuggestionLike.find({suggestionId:suggestion_id}).count().exec(function(err,sugglikeCount){
                    if(err){
                      console.log(err);
                      return asyncCallback(err); 
                    }
                // Get Suggestion UserLike Count
                SuggestionLike.find({$and:[
                        {suggestionId:suggestion_id},
                        {userId:loginid}
                    ]}).count().exec(function(err,sugglikeuserCount){
                  if(err){
                    console.log(err);
                    return asyncCallback(err); 
                  }

                  //Start suggviewCount
                SuggestionView.find({suggestionId:suggestion_id}).count().exec(function(err,suggviewCount){
                  if(err){
                    return asyncCallback(err); 
                  }
                  // Start Suggestion Like User Count
                  SuggestionView.find({$and:[
                        {suggestionId:suggestion_id},
                        {userId:loginid}
                      ]}).count().exec(function(err,suggviewuserCount){
                    if(err){                     
                      return asyncCallback(err); 
                    }

                //Get Suggestion Comment Count
                SuggestionComment.find({suggestionId:suggestion_id}).count().exec(function(err,suggcommentCount){
                  if(err){
                    console.log(err);
                    return asyncCallback(err); 
                  }

                //Get Suggestion Comment Count Data
                var commentList = [];
                  SuggestionComment.find({suggestionId:suggestion_id})
                    .populate('suggestionId')
                    .populate('userId').limit(10)
                    .exec(function(err,suggcommentsData){
                      if(err){
                        console.log(err);
                        return asyncCallback(err);  
                      }

                      if(suggcommentsData && suggcommentsData.length > 0)
                      {
                        suggcommentsData.forEach(function(suggcommentData){

                          var photo = (suggcommentData.userId.photo)?suggcommentData.userId.photo : '';
                          commentList.push({
                              'comment_id':suggcommentData._id.toString(),
                              'created_date':moment(suggcommentData.createdDate).format('YYYY-MM-DD HH:mm:ss'),
                              'UserId':suggcommentData.userId._id.toString(),
                              'UserName':suggcommentData.userId.userName,
                              'Photo':photo,
                              'comments':suggcommentData.comments
                          });

                        });
                        
                        var recent_comments = commentList;                                                                            
                      }else{                        
                        var recent_comments = Cmessage.filtersuggestion.NO_COMMENT;
                      }                      

                     //Collect all the suggestions Data that are filtered instant
                      var caption = (suggestion.caption != '')?suggestion.caption:'';
                      var count_likes = sugglikeCount;
                      var like_flag = sugglikeuserCount;
                      var count_views = suggviewCount;
                      var view_flag = suggviewuserCount;
                      var count_comments = suggcommentCount;
                      //var aws_file_url = (suggestion.awsFileUrl)?suggestion.awsFileUrl:'';
                      var file = (suggestion.awsFileUrl)?suggestion.awsFileUrl:'';
                      var aws_file_url = config.tinyurl.url+"?src="+suggestion._id;
                      var category = (suggestion.category && suggestion.category.title)?(suggestion.category.title):'';
                      var type = (suggestion.type && suggestion.type.name)?(suggestion.type.name):'';
                      var thumbnail = (suggestion.awsThumbnailUrl)?suggestion.awsThumbnailUrl:'';
                      var thumb = (suggestion.awsMinithumbUrl)?suggestion.awsMinithumbUrl:'';
                      var product_url = (suggestion.product_url)?suggestion.product_url:'';
                      var Photo = (suggestion.postedBy.photo)?suggestion.postedBy.photo:'';
                      //var created_at = moment(suggestion.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD');
                      var created_at = moment(suggestion.createdAt).tz(timezone).format('YYYY-MM-DD HH:mm:ss');
                    
                      suggestionData.push({
                        'suggestionId':suggestion._id.toString(),
                        'title':suggestion.title,
                        'caption':suggestion.caption,
                        'file':file,
                        'fileshare':aws_file_url,
                        'type':type,
                        'category':category,
                        'thumbnail':thumbnail,
                        'thumb':thumb,
                        'location':suggestion.location,
                        'lat':suggestion.lat,
                        'long':suggestion.long,
                        'reported':'0',
                        'toSuggestThat':suggestion.toSuggestthat.toString(),
                        'UserId':suggestion.postedBy._id.toString(),
                        'UserName':suggestion.postedBy.userName,
                        'product_url':product_url,
                        'Photo':Photo,
                        'created_at':created_at,
                        'count_likes':count_likes.toString(),
                        'like_flag':like_flag.toString(),
                        'count_views':count_views.toString(),
                        'view_flag':view_flag.toString(),
                        'count_comments':count_comments.toString(),
                        'recent_comments':recent_comments                        
                      });
                      asyncCallback();
                  }); //End Suggestion Comment Count Data

                }); //End Suggestion Comment Count
            
                }); //End Suggestion View Count Data
    
                }); //End Suggestion View Data

                }); // End Suggestion User Like Count

                }); //End Suggestion Like Count
                 
              }else{
                  asyncCallback();
              }
               
            },function(err){
              if(suggestionData.length > 0){

                suggestionData = suggestionData.sort(function(a, b) {
                  var sortResult = new Date(b.created_at) - new Date(a.created_at);
                  if (sortResult == 0) {
                    return b.suggestionId - a.suggestionId;
                  }
                  return sortResult;              
                });

                var totalrecord = suggestionData.length;
                count = start + count;
                suggestionData = suggestionData.slice(start,count);

                res.status(200).json({
                  AllSuggestions:suggestionData,
                  totalrecord:totalrecord,
                  message:Cmessage.filtersuggestion.SUGG_FOUND,
                  AllSuggestionsAck:Cmessage.condition.TRUE
                });
              }else{
                res.status(200).json({
                  message:Cmessage.filtersuggestion.SUGG_NOT_FOUND,
                  AllSuggestionsAck:Cmessage.condition.FALSE
                });
              }
            });
        }); //End Suggestion Data

    }else{ // isMyUpload is equal to zero

      
      var suggestionData = [];
      // Get Suggestion Map Data
      SuggestionMap.find({postedTo:loginid}).exec(function(err,suggmapData){

        async.each(suggmapData,function(suggestionMap,asyncCallback){

          var condition = [];
            condition.push({suggestionType:'Normal'});
            if(category && category != '')
            {
              condition.push({category:category});
            }
            if(type && type != '')
            {
              condition.push({type:type});
            }
            if(titlelocation && titlelocation != '')
            {
              condition.push({location:{'$regex': titlelocation}});
            }

            var suggestion_id = suggestionMap.suggestionId;
              
            condition.push({_id:suggestion_id});
            
            Suggestion.findOne({$and:condition})
              .populate('postedBy')
              .populate('type')
              .populate('category')
              .sort({createdAt:1})
              .exec(function(err,suggestion){
                if(err){
                  return res.sendStatus(400);
                }

                
                if(suggestion)
                {

                var postedby_id = suggestion.postedBy._id;
                var frndlike = (suggestion.postedBy.userName).search(frnd);

                //Get Suggestion Report Data
                SuggestionReport.find({$and:[
                    {reportedId:loginid},
                    {suggestionId:suggestion_id}
                  ]}).exec(function(err,suggreportData){
                    if(err){
                      console.log(err);
                      return asyncCallback(err);
                    }

                  //Get Request Data for RequestTo is equal to userid
                  Request.find({$and:[
                      {requestToId:postedby_id},
                      {status:'accepted'}
                    ]}).exec(function(err,reqData){
                      if(err){
                        console.log(err);
                        return asyncCallback(err);
                      }

                    //  if(frndlike > -1 && suggreportData && reqData){
                        //Start suggviewCount
                        SuggestionView.find({suggestionId:suggestion_id}).count().exec(function(err,suggviewCount){
                          if(err){
                            return asyncCallback(err); 
                          }
                          // Start Suggestion Like User Count
                          SuggestionView.find({$and:[
                                {suggestionId:suggestion_id},
                                {userId:loginid}
                              ]}).count().exec(function(err,suggviewuserCount){
                            if(err){                     
                              return asyncCallback(err); 
                            }
                          // Get Suggestion Like Count
                          SuggestionLike.find({suggestionId:suggestion_id}).count().exec(function(err,sugglikeCount){
                            if(err){
                               console.log(err);
                              return asyncCallback(err); 
                            }
                          //Get Suggestion Like User Count
                          SuggestionLike.find({$and:[
                                {suggestionId:suggestion_id},
                                {userId:loginid}
                              ]}).count().exec(function(err,sugglikeuserCount){
                            if(err){
                               console.log(err);
                              return asyncCallback(err); 
                            }
                          //Get Suggestion Comment Count
                          SuggestionComment.find({suggestionId:suggestion_id}).count().exec(function(err,suggcommentCount){
                            if(err){
                              console.log(err);
                              return asyncCallback(err);  
                            }

                              //Get Suggestion Comment Data
                              var commentList = [];
                              SuggestionComment.find({suggestionId:suggestion_id})
                                .populate('suggestionId')
                                .populate('userId').limit(10)
                                .exec(function(err,suggcommentsData){
                                  if(err){
                                    console.log(err);
                                    return asyncCallback(err);  
                                  }
                                  if(suggcommentsData && suggcommentsData.length > 0)
                                  {
                                    suggcommentsData.forEach(function(suggcommentData){

                                      var photo = (suggcommentData.userId.photo)?suggcommentData.userId.photo : '';
                                      commentList.push({
                                          'comment_id':suggcommentData._id.toString(),
                                          'created_date':moment(suggcommentData.createdDate).format('YYYY-MM-DD HH:mm:ss'),
                                          'UserId':suggcommentData.userId._id.toString(),
                                          'UserName':suggcommentData.userId.userName,
                                          'Photo':photo,
                                          'comments':suggcommentData.comments
                                      });
                                    });
                                    
                                    var recent_comments = commentList;                                                                            
                                  }else{
                                    var recent_comments = Cmessage.filtersuggestion.NO_COMMENT;
                                  }

                                //Collect all the suggestions Data that are filtered instant
                                var count_likes = sugglikeCount;
                                var like_flag = sugglikeuserCount;
                                var count_views = suggviewCount;
                                var view_flag = suggviewuserCount;
                                var count_comments = suggcommentCount;
                                var aws_file_url = (suggestion.awsFileUrl)?suggestion.awsFileUrl:'';
                                var category = (suggestion.category && suggestion.category.title)?(suggestion.category.title):'';
                                var type = (suggestion.type && suggestion.type.name)?(suggestion.type.name):'';
                                var thumbnail = (suggestion.awsThumbnailUrl)?suggestion.awsThumbnailUrl:'';
                                var thumb = (suggestion.awsMinithumbUrl)?suggestion.awsMinithumbUrl:'';
                                var reported = (suggreportData.reportFlag)?1:0;
                                var product_url = (suggestion.product_url)?suggestion.product_url:'';
                                var Photo = (suggestion.postedBy.photo)?suggestion.postedBy.photo:'';                      
                                //var created_at = moment(suggestion.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD');
                                var created_at = moment(suggestion.createdAt).tz(timezone).format('YYYY-MM-DD HH:mm:ss');
                               
                                  suggestionData.push({
                                  'suggestionId':suggestion._id.toString(),
                                  'title':suggestion.title,
                                  'caption':suggestion.caption,
                                  'file':aws_file_url,
                                  'fileshare':aws_file_url,
                                  'type':type,
                                  'category':category,
                                  'thumbnail':thumbnail,
                                  'thumb':thumb,
                                  'location':suggestion.location,
                                  'lat':suggestion.lat,
                                  'long':suggestion.long,                        
                                  'reported':reported.toString(),
                                  'toSuggestThat':suggestion.toSuggestthat.toString(),
                                  'UserId':suggestion.postedBy._id.toString(),
                                  'UserName':suggestion.postedBy.userName,
                                  'product_url':product_url,
                                  'Photo':Photo,
                                  'created_at':created_at,
                                  'count_likes':count_likes.toString(),
                                  'like_flag':like_flag.toString(),
                                  'count_views':count_views.toString(),
                                  'view_flag':view_flag.toString(),
                                  'count_comments':count_comments.toString(),
                                  'recent_comments':recent_comments                        
                                });
                                asyncCallback();
                              }); //End Suggestion Comment data
                            });  // End Suggestion Comment count
                            }); //End Suggestion LikeUser Count
                            }); // End Suggestion Like Count
                            }); //End Suggestion ViewUser Count
                            }); //End Suggestion View Count
                    //  }else{
                    //    asyncCallback();
                    //  }

                  }); 
                  //End Get Request Data for RequestTo is equal to userid
                });
                //End Get Suggestion Report Data

                }else{
                  asyncCallback();
                }

              });

        },function(err){

          if(suggestionData.length > 0){

              suggestionData = suggestionData.sort(function(a, b) {
                var sortResult = new Date(b.created_at) - new Date(a.created_at);
                if (sortResult == 0) {
                  return b.suggestionId - a.suggestionId;
                }
                return sortResult;              
              });

              var totalrecord = suggestionData.length;
              count = start + count;
              suggestionData = suggestionData.slice(start,count);

              res.status(200).json({
                AllSuggestions:suggestionData,
                totalrecord:totalrecord,
                message:Cmessage.filtersuggestion.SUGG_FOUND,
                AllSuggestionsAck:Cmessage.condition.TRUE
              });
          }else{
            res.status(200).json({
              message:Cmessage.filtersuggestion.SUGG_NOT_FOUND,
              AllSuggestionsAck:Cmessage.condition.FALSE
            });
          }
        }); 

      });
      // End Get Suggestion Map Data



      /*
      var condition = [];
      condition.push({suggestionType:'Normal'});
      if(category && category != '')
      {
        condition.push({category:category});
      }
      if(type && type != '')
      {
        condition.push({type:type});
      }
      if(titlelocation && titlelocation != '')
      {
        condition.push({location:{'$regex': titlelocation}});
      }      

      //Get Suggestion Data 
      Suggestion.find({$and:condition})
        .populate('postedBy')
        .populate('type')
        .populate('category')
        .sort({createdAt:1})
        .exec(function(err,suggestions){
          if(err){
            return res.sendStatus(400);
          }
          var suggestionData = [];
          async.each(suggestions,function(suggestion,asyncCallback){
            var suggestion_id = suggestion._id;
            var postedby_id = suggestion.postedBy._id;
            var frndlike = (suggestion.postedBy.userName).search(frnd);

            //Get Suggestion Report Data
            SuggestionReport.find({$and:[
                {reportedId:loginid},
                {suggestionId:suggestion_id}
              ]}).exec(function(err,suggreportData){
                if(err){
                  console.log(err);
                  return asyncCallback(err);
                }
            // Get Suggestion Map Data
            SuggestionMap.find({$and:[
                {postedTo:loginid},
                {suggestionId:suggestion_id}
              ]}).exec(function(err,suggmapData){
                if(err){
                  console.log(err);
                  return asyncCallback(err);
                }
            //Get Request Data for RequestTo is equal to userid
            Request.find({$and:[
                {requestToId:postedby_id},
                {status:'accepted'}
              ]}).exec(function(err,reqData){
                if(err){
                  console.log(err);
                  return asyncCallback(err);
                }
                
              //Above all condition is true
              if(frndlike > -1 && suggreportData && suggmapData && suggmapData.length > 0 && reqData){
                // Get Suggestion Like Count
                SuggestionLike.find({suggestionId:suggestion_id}).count().exec(function(err,sugglikeCount){
                  if(err){
                     console.log(err);
                    return asyncCallback(err); 
                  }
                //Get Suggestion Like User Count
                SuggestionLike.find({$and:[
                      {suggestionId:suggestion_id},
                      {userId:loginid}
                    ]}).count().exec(function(err,sugglikeuserCount){
                  if(err){
                     console.log(err);
                    return asyncCallback(err); 
                  }
                //Get Suggestion Comment Count
                SuggestionComment.find({suggestionId:suggestion_id}).count().exec(function(err,suggcommentCount){
                  if(err){
                    console.log(err);
                    return asyncCallback(err);  
                  }

                    //Get Suggestion Comment Data
                    var commentList = [];
                    SuggestionComment.find({suggestionId:suggestion_id})
                      .populate('suggestionId')
                      .populate('userId').limit(10)
                      .exec(function(err,suggcommentsData){
                        if(err){
                          console.log(err);
                          return asyncCallback(err);  
                        }
                        if(suggcommentsData && suggcommentsData.length > 0)
                        {
                          suggcommentsData.forEach(function(suggcommentData){

                            var photo = (suggcommentData.userId.photo)?suggcommentData.userId.photo : '';
                            commentList.push({
                                'comment_id':suggcommentData._id.toString(),
                                'created_date':moment(suggcommentData.createdDate).format('YYYY-MM-DD HH:mm:ss'),
                                'UserId':suggcommentData.userId._id.toString(),
                                'UserName':suggcommentData.userId.userName,
                                'Photo':photo,
                                'comments':suggcommentData.comments
                            });
                          });
                          
                          var recent_comments = commentList;                                                                            
                        }else{
                          var recent_comments = Cmessage.filtersuggestion.NO_COMMENT;
                        }

                      //Collect all the suggestions Data that are filtered instant
                      var count_likes = sugglikeCount;
                      var like_flag = sugglikeuserCount;
                      var count_comments = suggcommentCount;
                      var aws_file_url = (suggestion.awsFileUrl)?suggestion.awsFileUrl:'';
                      var category = (suggestion.category && suggestion.category.title)?(suggestion.category.title):'';
                      var type = (suggestion.type && suggestion.type.name)?(suggestion.type.name):'';
                      var thumbnail = (suggestion.awsThumbnailUrl)?suggestion.awsThumbnailUrl:'';
                      var thumb = (suggestion.awsMinithumbUrl)?suggestion.awsMinithumbUrl:'';
                      var reported = (suggreportData.reportFlag)?1:0;
                      var product_url = (suggestion.product_url)?suggestion.product_url:'';
                      var Photo = (suggestion.postedBy.photo)?suggestion.postedBy.photo:'';                      
                      //var created_at = moment(suggestion.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD');
                      var created_at = moment(suggestion.createdAt).tz(timezone).format('YYYY-MM-DD');
                     
                        suggestionData.push({
                        'suggestionId':suggestion._id.toString(),
                        'title':suggestion.title,
                        'caption':suggestion.caption,
                        'file':aws_file_url,
                        'fileshare':aws_file_url,
                        'type':type,
                        'category':category,
                        'thumbnail':thumbnail,
                        'thumb':thumb,
                        'location':suggestion.location,
                        'lat':suggestion.lat,
                        'long':suggestion.long,                        
                        'reported':reported.toString(),
                        'toSuggestThat':suggestion.toSuggestthat.toString(),
                        'UserId':suggestion.postedBy._id.toString(),
                        'UserName':suggestion.postedBy.userName,
                        'product_url':product_url,
                        'Photo':Photo,
                        'created_at':created_at,
                        'count_likes':count_likes.toString(),
                        'like_flag':like_flag.toString(),
                        'count_comments':count_comments.toString(),
                        'recent_comments':recent_comments                        
                      });
                      asyncCallback();
                    }); //End Suggestion Comment data
                  });  // End Suggestion Comment count
                  }); //End Suggestion LikeUser Count
                  }); // End Suggestion Like Count
              }else{
                asyncCallback();
              }
            }); //End Request Data 
            }); // End Suggestion Map Data
            }); //End Suggestion Report Data

          },function(err){
            if(suggestionData.length > 0){

                suggestionData = suggestionData.sort(function(a, b) {
                  var sortResult = new Date(b.created_at) - new Date(a.created_at);
                  if (sortResult == 0) {
                    return b.suggestionId - a.suggestionId;
                  }
                  return sortResult;              
                });

                var totalrecord = suggestionData.length;
                count = start + count;
                suggestionData = suggestionData.slice(start,count);

                res.status(200).json({
                  AllSuggestions:suggestionData,
                  totalrecord:totalrecord,
                  message:Cmessage.filtersuggestion.SUGG_FOUND,
                  AllSuggestionsAck:Cmessage.condition.TRUE
                });
            }else{
              res.status(200).json({
                message:Cmessage.filtersuggestion.SUGG_NOT_FOUND,
                AllSuggestionsAck:Cmessage.condition.FALSE
              });
            }
          }); 
        }); // End Suggestion Data
        */
    } 
  }else{
    res.status(200).json({
      message:Cmessage.parameters.MESSAGE,
      AllSuggestionsAck:Cmessage.condition.FALSE
    });
  } 
  
};

//19.searchlatest and 20. searchsuggestions 
exports.searchSuggestions = function(req,res){
  var search = (req.body.search)?req.body.search:'';
  var loginid = (req.body.loginid)?req.body.loginid:'';
  var timezone = (req.body.timezone)?req.body.timezone:'+00:00';

  if(timezone.indexOf('\\') > -1)
  {
    timezone = timezone.replace(/\\/g, '');  
  }

  var category = (req.body.category)?req.body.category:'';
  var type = (req.body.type)?req.body.type:'';
  var titlelocation = (req.body.titlelocation)?req.body.titlelocation:'';
  var start = (req.body.start)?req.body.start:0;
  var count = (req.body.count)?req.body.count:10;
  start = parseInt(start);
  count = parseInt(count);
  
  if(loginid && loginid!== '' && timezone && timezone!== ''){
     var condition = [];
      condition.push({suggestionType:'Normal'});
      condition.push({toSuggestthat:1});
      if(category!=='' ){
        condition.push({category:category});
      }
      if(type!=='')
      {
        condition.push({type:type});
      }
      if(titlelocation!=='')
      {
        //condition.push({location:{'$regex': titlelocation}});
        condition.push({location:new RegExp(titlelocation, "i")});        
      }
    //Get Suggestion Data
    Suggestion.find({$and:condition})
      .populate('postedBy')
      .populate('type')
      .populate('category')
      .sort({createdAt:1})
      .exec(function(err,suggestions){
        if(err){
          return res.sendStatus(400);
        }
  
        var suggestionData = [];
        async.each(suggestions,function(suggestion,asyncCallback){
            var suggestion_id = suggestion._id;
            //Get Suggestion Report Data
            SuggestionReport.find({$and:[
                {reportedId:loginid},
                {suggestionId:suggestion_id}
              ]}).exec(function(err,suggreportData){
                if(err){                  
                  return asyncCallback(err);
                }
            if(suggreportData && suggreportData.length > 0){
              SuggestionView.find({suggestionId:suggestion_id}).count().exec(function(err,suggviewCount){
                if(err){
                  return asyncCallback(err); 
                }
                // Start Suggestion Like User Count
                SuggestionView.find({$and:[
                      {suggestionId:suggestion_id},
                      {userId:loginid}
                    ]}).count().exec(function(err,suggviewuserCount){
                  if(err){                     
                    return asyncCallback(err); 
                  }
               // Get Suggestion Like Count
                SuggestionLike.find({suggestionId:suggestion_id}).count().exec(function(err,sugglikeCount){
                  if(err){                     
                    return asyncCallback(err); 
                  }
                //Get Suggestion Like User Count
                SuggestionLike.find({$and:[
                      {suggestionId:suggestion_id},
                      {userId:loginid}
                    ]}).count().exec(function(err,sugglikeuserCount){
                  if(err){                     
                    return asyncCallback(err); 
                  }
                //Get Suggestion Comment Count
                SuggestionComment.find({suggestionId:suggestion_id}).count().exec(function(err,suggcommentCount){
                  if(err){                    
                    return asyncCallback(err);  
                  }

                    //Get Suggestion Comment Data
                    var commentList = [];
                    SuggestionComment.find({suggestionId:suggestion_id})
                      .populate('suggestionId')
                      .populate('userId').limit(10)
                      .exec(function(err,suggcommentsData){
                        if(err){                          
                          return asyncCallback(err);  
                        }
                        if(suggcommentsData && suggcommentsData.length > 0)
                        {
                          suggcommentsData.forEach(function(suggcommentData){

                            var photo = (suggcommentData.userId.photo)?suggcommentData.userId.photo : '';                            
                            commentList.push({
                                'comment_id':suggcommentData._id.toString(),
                                'created_date':moment(suggcommentData.createdDate).format('YYYY-MM-DD HH:mm:ss'),
                                'UserId':suggcommentData.userId._id.toString(),
                                'UserName':suggcommentData.userId.userName,
                                'Photo':photo,
                                'comments':suggcommentData.comments
                            });
                          });
                          
                          var recent_comments = commentList;                                                                            
                        }else{
                          var recent_comments = Cmessage.searchsuggestion.NO_COMMENT;
                        }

                      //Collect all the suggestions Data that are filtered instant
                      var count_likes = sugglikeCount;
                      var like_flag = sugglikeuserCount;
                      var count_views = suggviewCount;
                      var view_flag = suggviewuserCount;
                      var count_comments = suggcommentCount;
                      var aws_file_url = (suggestion.awsFileUrl)?suggestion.awsFileUrl:'';
                      var category = (suggestion.category && suggestion.category.title)?(suggestion.category.title):'';
                      var type = (suggestion.type && suggestion.type.name)?(suggestion.type.name):'';
                      var thumbnail = (suggestion.awsThumbnailUrl)?suggestion.awsThumbnailUrl:'';
                      var thumb = (suggestion.awsMinithumbUrl)?suggestion.awsMinithumbUrl:'';
                      var reported = (suggreportData.reportFlag)?1:0;
                      var product_url = (suggestion.product_url)?suggestion.product_url:'';
                      var Photo = (suggestion.postedBy.photo)?suggestion.postedBy.photo:'';
                      //var created_at = moment(suggestion.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD');
                      var created_at = moment(suggestion.createdAt).tz(timezone).format('YYYY-MM-DD');
                      var customsort_field = (suggestion.type.name == search)?suggestion.type.name:'';
                     
                        suggestionData.push({
                        'suggestionId':suggestion._id.toString(),
                        'title':suggestion.title,
                        'caption':suggestion.caption,
                        'file':aws_file_url,
                        'fileshare':aws_file_url,
                        'type':type,
                        'category':category,
                        'thumbnail':thumbnail,
                        'thumb':thumb,
                        'location':suggestion.location,
                        'lat':suggestion.lat,
                        'long':suggestion.long,
                        'reported':reported.toString(),
                        'toSuggestThat':suggestion.toSuggestthat.toString(),
                        'UserId':suggestion.postedBy._id.toString(),
                        'UserName':suggestion.postedBy.userName,
                        'product_url':product_url,
                        'Photo':Photo,
                        'created_at':created_at,
                        'customsort_field':customsort_field,
                        'count_likes':count_likes.toString(),
                        'like_flag':like_flag.toString(),
                        'count_views':count_views.toString(),
                        'view_flag':view_flag.toString(),
                        'count_comments':count_comments.toString(),
                        'recent_comments':recent_comments
                      });
  
                      asyncCallback();
                    }); //End Suggestion Comment data
                  });  // End Suggestion Comment count
                  }); //End Suggestion LikeUser Count
                  }); // End Suggestion Like Count
                  }); //End Suggestion ViewUser Count
                  }); // End Suggestion View Count
            }else{
              //Get Suggestion View Count
              SuggestionView.find({suggestionId:suggestion_id}).count().exec(function(err,suggviewCount){
                if(err){
                  return asyncCallback(err); 
                }
                // Start Suggestion View User Count
                SuggestionView.find({$and:[
                      {suggestionId:suggestion_id},
                      {userId:loginid}
                    ]}).count().exec(function(err,suggviewuserCount){
                  if(err){                     
                    return asyncCallback(err); 
                  }
                  // Get Suggestion Like Count
                  SuggestionLike.find({suggestionId:suggestion_id}).count().exec(function(err,sugglikeCount){
                    if(err){                       
                      return asyncCallback(err); 
                    }
                  //Get Suggestion Like User Count
                  SuggestionLike.find({$and:[
                        {suggestionId:suggestion_id},
                        {userId:loginid}
                      ]}).count().exec(function(err,sugglikeuserCount){
                    if(err){                       
                      return asyncCallback(err); 
                    }
                  //Get Suggestion Comment Count
                  SuggestionComment.find({suggestionId:suggestion_id}).count().exec(function(err,suggcommentCount){
                    if(err){                      
                      return asyncCallback(err);  
                    }

                    //Get Suggestion Comment Data
                    var commentList = [];
                    SuggestionComment.find({suggestionId:suggestion_id})
                      .populate('suggestionId')
                      .populate('userId').limit(10)
                      .exec(function(err,suggcommentsData){
                        if(err){                          
                          return asyncCallback(err);  
                        }
                        if(suggcommentsData && suggcommentsData.length > 0)
                        {
                          suggcommentsData.forEach(function(suggcommentData){

                            var photo = (suggcommentData.userId.photo)?suggcommentData.userId.photo : '';
                            commentList.push({
                                'comment_id':suggcommentData._id.toString(),
                                'created_date':moment(suggcommentData.createdDate).format('YYYY-MM-DD HH:mm:ss'),
                                'UserId':suggcommentData.userId._id.toString(),
                                'UserName':suggcommentData.userId.userName,
                                'Photo':photo,
                                'comments':suggcommentData.comments
                            });
                          });
                          
                          var recent_comments = commentList;                                                                            
                        }else{
                          var recent_comments = Cmessage.searchsuggestion.NO_COMMENT;
                        }

                      //Collect all the suggestions Data that are filtered instant
                      var count_likes = sugglikeCount;
                      var like_flag = sugglikeuserCount;
                      var count_views = suggviewCount;
                      var view_flag = suggviewuserCount;
                      var count_comments = suggcommentCount;
                      var aws_file_url = (suggestion.awsFileUrl)?suggestion.awsFileUrl:'';
                      var category = (suggestion.category && suggestion.category.title)?(suggestion.category.title):'';
                      var type = (suggestion.type && suggestion.type.name)?(suggestion.type.name):'';
                      var thumbnail = (suggestion.awsThumbnailUrl)?suggestion.awsThumbnailUrl:'';
                      var thumb = (suggestion.awsMinithumbUrl)?suggestion.awsMinithumbUrl:'';
                      var reported = (suggreportData.reportFlag)?1:0;
                      var product_url = (suggestion.product_url)?suggestion.product_url:'';
                      var Photo = (suggestion.postedBy.photo)?suggestion.postedBy.photo:'';                      
                      //var created_at = moment(suggestion.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD');
                      var created_at = moment(suggestion.createdAt).tz(timezone).format('YYYY-MM-DD');
                      var customsort_field = (suggestion.type && suggestion.type.name == search)?(suggestion.type.name):'';
                     
                        suggestionData.push({
                        'suggestionId':suggestion._id.toString(),
                        'title':suggestion.title,
                        'caption':suggestion.caption,
                        'file':aws_file_url,
                        'fileshare':aws_file_url,
                        'type':type,
                        'category':category,
                        'thumbnail':thumbnail,
                        'thumb':thumb,
                        'location':suggestion.location,
                        'lat':suggestion.lat,
                        'long':suggestion.long,
                        'reported':reported.toString(),
                        'toSuggestThat':suggestion.toSuggestthat.toString(),
                        'UserId':suggestion.postedBy._id.toString(),
                        'UserName':suggestion.postedBy.userName,
                        'product_url':product_url,
                        'Photo':Photo,
                        'created_at':created_at,
                        'customsort_field':customsort_field,
                        'count_likes':count_likes.toString(),
                        'like_flag':like_flag.toString(),
                        'count_views':count_views.toString(),
                        'view_flag':view_flag.toString(),
                        'count_comments':count_comments.toString(),
                        'recent_comments':recent_comments
                      });
                      
                      asyncCallback();
                    }); //End Suggestion Comment data
                  });  // End Suggestion Comment count
                  }); //End Suggestion LikeUser Count
                  }); // End Suggestion Like Count
                  }); //End Suggestion ViewUser Count
                  }); // End Suggestion View Count
            }
            }); // End Suggestion Report Data
        },function(err){
          if(suggestionData && suggestionData.length > 0){
            suggestionData = suggestionData.sort(function(a, b) {
             var sortResult = new Date(b.created_at) - new Date(a.created_at);
             if (sortResult == 0) {
               return b.suggestionId - a.suggestionId;
             }
             return sortResult;              
           });
           
            var totalrecord = suggestionData.length;
            count = start + count;
            suggestionData = suggestionData.slice(start,count);
            
            res.status(200).json({
              Suggestions:suggestionData,
              Total:totalrecord,
              message:Cmessage.searchsuggestion.SUGG_FOUND,
              SearchSuggestionsAck:Cmessage.condition.TRUE
            });
          }else{
            res.status(200).json({
              message:Cmessage.searchsuggestion.SUGG_NOT_FOUND,
              SearchSuggestionsAck:Cmessage.condition.FALSE
            });
          }            
        });
      });// End Suggestion Data
  }else{
    res.status(200).json({
      message:Cmessage.parameters.MESSAGE,
      SearchSuggestionsAck:Cmessage.condition.FALSE
    });
  }
};


// 21st Api Report suggestion 
exports.reportSuggestion = function(req,res){

  var loginid = req.body.loginid; //Insert UserId 
  var suggestionid = req.body.suggestionid; // Insert SuggestionId
  if(loginid && suggestionid){
    //If Suggestion is already reported once
    SuggestionReport.findOne({$and:[
      {suggestionId:suggestionid},
      {reportedId:loginid}]},function(err,suggestionReportData){
        if(err){
          return res.sendStatus(400);
        }
        if(suggestionReportData){
          res.status(200).json({
              message:Cmessage.suggestionreport.ALREADY_REPORTED,
              SuggestionsReportAck:Cmessage.condition.FALSE
          });
        }
        else{    //If not reported the suggestions insert the suggestion report
            var newSuggestionReport = new SuggestionReport();
            newSuggestionReport.suggestionId = suggestionid;
            newSuggestionReport.reportedId = loginid;
            newSuggestionReport.reportFlag = "1";
            newSuggestionReport.reportedTime = moment().format('YYYY-MM-DD HH:mm:ss');
            newSuggestionReport.save(function(err,insertReport){
              if(err){
                return res.sendStatus(400);
              }
              if(insertReport){
                res.status(200).json({
                  message:Cmessage.suggestionreport.REPORTED_SUCCESS,
                  SuggestionsReportAck:Cmessage.condition.TRUE
                });
              }
            });
        }
    });
  }else{      //If parameters not added
    res.status(200).json({
      message:Cmessage.parameters.MESSAGE,
      SuggestionsReportAck:Cmessage.condition.FALSE
    });
  }
};

//22nd api Remove suggestion by id and unlink photo and video
exports.discardSuggestion = function(req,res){
  var uid = req.body.uid;
  var loginid = req.body.loginid;
  var suggestion_id = req.body.suggestion_id;
  if(loginid && suggestion_id){
    if(uid && loginid!=uid){
        SuggestionMap.findOne({$and:[
          {suggestionId:suggestion_id},
          {postedTo:loginid}]},function(err,suggestionData){
            if(err){
              return res.sendStatus(400);
            }
            if(suggestionData){
              SuggestionMap.remove({$and:[
                {suggestionId:suggestion_id},
                {postedTo:loginid}]},function(err,deleteSuggestionmap){
                  if(err){
                    return res.sendStatus(400);
                  }
                  if(deleteSuggestionmap){
                    res.status(200).json({
                      message:Cmessage.suggestiondiscard.DEL_SUCCESS,
                      SuggestionsDeletedAck:Cmessage.condition.TRUE
                    });
                  }
               });
            }
            if(!suggestionData){
              res.status(200).json({
                message:Cmessage.suggestiondiscard.SUGG_NOT_FOUND,
                SuggestionsDeletedAck:Cmessage.condition.FALSE
              });
            } 
        });
    }else{
       //delete it self suggestion from the server
        Suggestion.findOne({$and:[
          {_id:suggestion_id},
          {postedBy:loginid}]},function(err,suggestion){
            if(err){
              return res.sendStatus(400);
            }
            if(suggestion){  
              //Code for removing file from amazon
              awsSdk.deleteAWSFile(suggestion.awsFileUrl,0);
              /* 
              var file = 'public/uploads/files/'+suggestion.file;
              if(fs.existsSync(file))
              {
                fs.exists(file, function(exists){ 
                  fs.unlink(file);
                });
              }
              */
              //Code for removing file from amazon
              awsSdk.deleteAWSFile(suggestion.awsThumbnailUrl,0);
              /*
              var thumb = 'public/uploads/files/thumb/'+suggestion.thumbNail;              
              if(fs.existsSync(thumb)){
                fs.exists(thumb, function(exists) {
                  fs.unlink(thumb);
                });
              }
              */
              
              //Code for removing file from amazon
              awsSdk.deleteAWSFile(suggestion.awsMinithumbUrl,1);
              /*
              var thumbnail = 'public/uploads/files/thumb/thumbnail/'+suggestion.thumbNail;              
              if(fs.existsSync(thumbnail)){
               fs.exists(thumbnail, function(exists) {
                  fs.unlink(thumbnail);
                });
              }
              */
            
              //Remove files and thumbnail
              SuggestionMap.remove({suggestionId:suggestion_id},function(err,removeSuggestionmap){
                  if(err){
                    return res.sendStatus(400);
                  }
                  if(removeSuggestionmap){
                    Suggestion.remove({_id:suggestion_id},function(err,removeSuggestionmap){
                      if(err){
                        return res.sendStatus(400);
                      }
                      if(removeSuggestionmap){
                        SuggestionLike.remove({suggestionId:suggestion_id},function(err,suggestionLikeRemove){
                          if(err){
                            // Log Error
                          }                          
                        });                        
                        SuggestionComment.remove({suggestionId:suggestion_id},function(err,suggestionLikeRemove){
                          if(err){
                            // Log Error
                          }                          
                        });                        
                        SuggestionView.remove({suggestionId:suggestion_id},function(err,suggestionLikeRemove){
                          if(err){
                            // Log Error
                          }                          
                        });                        
                        SuggestionReport.remove({suggestionId:suggestion_id},function(err,suggestionLikeRemove){
                          if(err){
                            // Log Error
                          }                          
                        });                        

                        res.status(200).json({
                          message:Cmessage.suggestiondiscard.DEL_SUCCESS,
                          SuggestionsDeletedAck:Cmessage.condition.TRUE
                        });
                      }
                    });
                  }
              });
            }else{
              res.status(200).json({
                message:Cmessage.suggestiondiscard.SUGG_NOT_FOUND,
                SuggestionsDeletedAck:Cmessage.condition.FALSE
              });
            }
        });
    }
  }else{
      res.status(200).json({
        message:Cmessage.parameters.MESSAGE,
        SuggestionsDeletedAck:Cmessage.condition.FALSE
      });
  }
};

//23rd Api Update tosuggestthat if to post on suggestthat application
exports.postonSuggesthat = function(req,res){
  var loginid = (req.body.loginid)?req.body.loginid:'';
  var suggestionid = (req.body.suggestionid)?req.body.suggestionid:'';
  if(loginid && suggestionid){
    Suggestion.findOne({$and:[
      {postedBy:loginid},
      {_id:suggestionid}
      ]},function(err,suggestionData){
        if(err){
          return res.sendStatus(400);
        }

        if(suggestionData){
          if(suggestionData.toSuggestthat == 0 || suggestionData.toSuggestthat == 1){
            if(suggestionData.toSuggestthat == 1){
              res.status(200).json({
                message:Cmessage.suggestthat.ALREADY_SHARED,
                PostonSuggestThatAck:Cmessage.condition.FALSE
              }); 
            }else{
              suggestionData.toSuggestthat = 1;
              suggestionData.updatedAt = new Date();
              suggestionData.save(function(err,updateSuggestion){
                  if(err){
                    return res.sendStatus(400);
                  }
                  if(updateSuggestion){
                    res.status(200).json({
                      message:Cmessage.suggestthat.SHARED,
                      PostonSuggestThatAck:Cmessage.condition.TRUE
                    });
                  }
              });
            }
          }        
        }else{
          res.status(200).json({
            message:Cmessage.suggestthat.SUGG_NOT_FOUND,
            PostonSuggestThatAck:Cmessage.condition.FALSE
          });
        }
      });
  }else{
    res.status(200).json({
      message:Cmessage.parameters.MESSAGE,
      PostonSuggestThatAck:Cmessage.condition.FALSE
    });
  }
};

// 24th Api Clear All suggestions tab
exports.clearallSuggestion = function(req,res){
  var id = req.body.id //Input User Id
  if(id){
    Suggestion.find({postedBy:id},function(err,suggestionsData){
      SuggestionMap.find({postedTo:id},function(err,suggestionsMapData){
        if(err){
          return res.sendStatus(400);
        }
        if((suggestionsData && suggestionsData.length>0)  || (suggestionsMapData && suggestionsMapData.length>0)){
          //console.log(doc+"========"+d);
          SuggestionMap.remove({postedTo:id});
            if(suggestionsData){
              suggestionsData.forEach(function(suggestionData){
                //Remove files and thumb and thumbnail
                  awsSdk.deleteAWSFile(suggestionData.awsFileUrl,0);
                  /*
                  var file = 'public/uploads/files/'+suggestionData.file;
                  if(fs.existsSync(file))
                  {
                    fs.exists(file, function(exists){ 
                      fs.unlink(file);
                    });
                  }
                  */
                 
                  awsSdk.deleteAWSFile(suggestionData.awsThumbnailUrl,0);
                  /*
                  var thumb = 'public/uploads/files/thumb/'+suggestionData.thumbNail;
                  if(fs.existsSync(thumb))
                  {
                    fs.exists(thumb, function(exists){ 
                      fs.unlink(thumb);
                    });
                  }
                  */                
                
                  awsSdk.deleteAWSFile(suggestionData.awsMinithumbUrl,1);
                  /*
                  var thumbnail = 'public/uploads/files/thumb/thumbnail/'+suggestionData.thumbNail;
                  if(fs.existsSync(thumb))
                  {
                    fs.exists(thumbnail, function(exists){ 
                      fs.unlink(thumbnail);
                    });
                  }
                  */
                  
                  //Remove files and thumb
                  SuggestionMap.remove({suggestionId:suggestionData._id},function(err,removeSuggestionmap){
                    if(err){
                      return res.sendStatus(400);
                    }
                    
                  });//Remove Suggestionmap data
                  // End of Remove files and thumb
              });//If Suggestions are found then foreach ends
                  Suggestion.remove({postedBy:id},function(err,removeSuggestion){
                      if(err){
                        return res.sendStatus(400);
                      }
                      if(removeSuggestion){

                      }
                  });
          }        
            res.status(200).json({
              message:Cmessage.suggestionclearall.SUGG_DEL,
              DeleteSuggestionAck:Cmessage.condition.TRUE
            });
        }else{
          res.status(200).json({
            message:Cmessage.suggestionclearall.SUGG_NOT_FOUND,
            DeleteSuggestionAck:Cmessage.condition.FALSE
          });
        }
      });
    }); 
  }else{
    res.status(200).json({
      message:Cmessage.parameters.MESSAGE,
      DeleteSuggestionAck:Cmessage.condition.FALSE
    });
  }
};

//25thApi Alert For Suggestions
exports.suggestionAlert = function(req,res){
  var id = (req.body.id)?req.body.id:'';
  var updateFlag = req.body.update?req.body.update:'0';
  if(id && updateFlag){
    
      SuggestionMap.find({$and:[
        {postedTo:id},
        {lastAlertViewed:'0000-00-00 00:00:00'}
        ]}).populate({path: 'suggestionId',
                  match: {suggestionType:'Normal'},
                  select:'_id'}).count().exec(function(err,suggestionMapData){
        if(err){
          return res.sendStatus(400);
        }
        if(suggestionMapData && suggestionMapData.length > 0){
          var displaycounter = suggestionMapData;
        }else{
           var displaycounter = "";
        }
        //If data found then count the suggestions
        if(displaycounter && displaycounter>0){
          
          res.status(200).json({
            AllTotal:displaycounter,
            message:Cmessage.suggestionalert.ALERT_FOUND,
            AlertAck:Cmessage.condition.TRUE
          });
        }else{
          
          res.status(200).json({
            message:Cmessage.suggestionalert.NO_ALERT,
            AlertAck:Cmessage.condition.FALSE
          });
          
        }
      });              
        
    if(updateFlag == '1'){
      SuggestionMap.find({$and:[
        {postedTo:id},
        {lastAlertViewed:'0000-00-00 00:00:00'}
        ]}).populate({path: 'suggestionId',
                  match: {suggestionType:'Normal'},
        }).exec(function(err,updateSuggestionMap){
        if(err){
          return res.sendStatus(400);
        }
        //Data found
        if(updateSuggestionMap){
          updateSuggestionMap.forEach(function(update){
            update.lastAlertViewed = moment().format('YYYY-MM-DD HH:mm:ss');
            update.save();
          });   
        }
      });
    }
  }else{
      res.status(200).json({
          message:Cmessage.parameters.MESSAGE,
          AlertAck:Cmessage.condition.FALSE
      });
  }
};

//27th Api Like the Suggestions
exports.likeSuggestion = function(req,res){

  var user_id = req.body.user_id;
  var flag_type = (req.body.flag)?req.body.flag:'';
  var suggestion_id = req.body.suggestion_id;
  var Requested_At =  moment().format('YYYY-MM-DD HH:mm:ss'); 

  if(suggestion_id && user_id){
    User.findOne({_id:user_id}).count().exec(function(err,userData){
      Suggestion.findOne({_id:suggestion_id},function(err,suggestionsData){
          if(err){
            return res.sendStatus(400);
          }
          if(userData && suggestionsData){

              var posted_by = suggestionsData.postedBy;
              var location = suggestionsData.location;
              var locationData = location.split(',');

                //Find howmany suggestions are like of userid and suggestionid given
                SuggestionLike.find({$and:[{suggestionId:suggestion_id},{userId:user_id}]}).count().exec(function(err,countlike){
                    if(err){
                      return res.sendStatus(400);
                    }
                    if(countlike){
                      var totallike = countlike;                      
                    }
                });
                
                  //For unlike the suggestions
                  if(flag_type == 0){  
                    SuggestionLike.remove({$and:[{suggestionId:suggestion_id},{userId:user_id}]},function(err,removelikes){
                      if(err){
                        console.log(err);
                      }
                      if(removelikes){
                        res.status(200).json({
                          message:Cmessage.likesuggestion.UNLIKE_SUCCESS,
                          status:Cmessage.condition.TRUE
                        });
                      }
                    });
                  }else if(flag_type == 1){
                    SuggestionLike.remove({$and:[{suggestionId:suggestion_id},{userId:user_id}]},function(err,removelikes){
                      if(err){
                        return res.sendStatus(400);
                      }
                      
                    });
                      var newSuggestionLike = new SuggestionLike();
                      newSuggestionLike.suggestionId = suggestion_id;
                      newSuggestionLike.userId = user_id;
                      newSuggestionLike.createdDate = Requested_At;
                      newSuggestionLike.save(function(err,insertsuggestionLike){
                        if(err){
                          return res.sendStatus(400);
                        }
                        if(insertsuggestionLike){
                          res.status(200).json({
                            message:Cmessage.likesuggestion.LIKE_SUCCESS,
                            status:Cmessage.condition.TRUE
                          });
                        }
                      });
                        /* SEND PUSH NOTIFICATION TO POSTED_BY USER*/
                        
                      User.findOne({_id:posted_by},function(err,usertoken){
                        var usestoken = usertoken.token;
                          if(usestoken && user_id != posted_by){
                            //Get device_type and username one liked the suggestion 
                            User.findOne({_id:user_id},function(err,userdata){
                                var fromName = userdata.userName;
                                //Get devicetype from users collection one that is postedby user
                                var device_type = usertoken.deviceType;
                                //get from name
                                var typess = '';
                                var message = fromName+' liked your suggestion';
                                var token = usestoken;
                                var locationdata = location;
                                Suggestion.find({_id:suggestion_id},function(err,suggestions){
                                  if(err){
                                    console.log(err);
                                  }
                                     var suggestions_data  = [];
                                    suggestions.forEach(function(suggestion){
                                      suggestions_data.push({
                                        'aws_file_url':suggestion.awsFileUrl,
                                        'aws_thumbnail_url':suggestion.awsThumbnailUrl,
                                        'lat':suggestion.lat,
                                        'long':suggestion.long,
                                        'user_id' : user_id,
                                        'username' : fromName        
                                      });
                                    });

                                if(device_type == 'IPHONE'){
                                    var message = fromName+' liked your suggestion';
                                      var options = {
                                        cert: config.apns.certificate,
                                        key: config.apns.key,
                                        gateway: config.apns.apn_getway,
                                        port: config.apns.apn_port
                                      };
                                     
                                    var apnConnection = new apn.Connection(options);
                                    
                                    apnConnection.on("connected", function() {
                                        //console.log("Connected");
                                    });

                                    apnConnection.on("sent", function() {
                                        console.log("sent");
                                    });

                                    apnConnection.on("error", function() {
                                        console.log("error");
                                    });
                                    console.log('IPHONR MEDSSAE'+message);
                                    var myDevice = new apn.Device(token);

                                    var note = new apn.Notification();
                                    //note.badge = 3;

                                    var payload = {
                                      'suggestion': suggestions_data,
                                      'suggestion_id' : suggestion_id.toString(),
                                      'location' : locationData[0],                            
                                      'type' : 1,
                                    };

                                    note.sound = "default";
                                    note.alert =  message;
                                    note.payload =  payload;
                                    
                                    apnConnection.pushNotification(note, myDevice);
                                    
                                }else{
                                  //device_type == 'ANDROID'
                                    var message = fromName+' liked your suggestion';
                                    var regTokens = [];
                                    regTokens.push(token);
                                    console.log('Registered Tokens'+regTokens);
                                    // initialize new androidGcm object 
                                    var gcmObject = new gcm.AndroidGcm('AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc');
                                     console.log(message);
                                    // create new message 
                                    var message = new gcm.Message({
                                        registration_ids: regTokens,
                                        data: {
                                          "message" : {'message':message,
                                          "type":1,
                                          "suggestion_id": suggestion_id, 
                                          "user_id":user_id,
                                          "username":fromName,
                                          "location":locationData[0],
                                          "suggestion":suggestions_data 
                                          }                                         
                                        }
                                    });

                                    gcmObject.send(message, function(err, response) {
                                      if(err) console.error(err);
                                        else    console.log(response);
                                    });
                                }
                                //Push Notification Code for location is left
                              }); //End Of Suggestion Data
                            }); //End Of User Data 
                          }
                      });  
                  }else{
                    res.status(200).json({
                      message:Cmessage.parameters.PROPER_VALUE,
                      status:Cmessage.condition.FALSE
                    });
                  }        
            } //If suggestion and user are found
        if(!suggestionsData){
          res.status(200).json({
            message:Cmessage.likesuggestion.SUGG_NOT_FOUND,
            status:Cmessage.condition.FALSE
          });
        }
      });
        if(!userData){
          res.status(200).json({
            message:Cmessage.likesuggestion.USER_NOT_FOUND,
            status:Cmessage.condition.FALSE
          }); 
        }
    });
  }else{
    res.status(200).json({
        message:Cmessage.parameters.PROPER_VALUE,
        status:Cmessage.condition.FALSE
    });
  }
};

//53rd Api View Suggestion
exports.viewSuggestion = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id:'';
  var flag_type = (req.body.flag)?req.body.flag:'';
  var suggestion_id = (req.body.suggestion_id)?req.body.suggestion_id:'';
  var timezone = (req.body.timezone)?req.body.timezone:'+00:00';
  var Requested_At =  moment().format('YYYY-MM-DD HH:mm:ss'); 

  if(suggestion_id && user_id){
    //Get User Data   
    User.findOne({_id:user_id}).exec(function(err,userData){
      Suggestion.findOne({_id:suggestion_id},function(err,suggestionsData){
        if(err){
          return res.sendStatus(400);
        }
        if(userData && suggestionsData){
          var posted_by = suggestionsData.postedBy;
          var location = suggestionsData.location;
          var locationData = location.split(',');

            SuggestionView.find({$and:[{suggestionId:suggestion_id},{userId:user_id}]}).count().exec(function(err,countview){
              if(err){
                return res.sendStatus(400);
              }
                var totalView = countview; 
            //For unlike the suggestions
            if(flag_type == 0){
              console.log('In 0');
              SuggestionView.remove({$and:[{suggestionId:suggestion_id},{userId:user_id}]},function(err,removeViews){
                if(err){
                  console.log(err);
                }
                if(removeViews){
                  res.status(200).json({
                    message:Cmessage.viewsuggestion.UNLIKE_SUCCESS,
                    status:Cmessage.condition.TRUE
                  });
                }
              });
            }else if(flag_type == 1){
              console.log('In 1');
              SuggestionView.find({$and:[{suggestionId:suggestion_id},{userId:user_id}]}).count().exec(function(err,suggestionViewData){
                if(err){
                  return res.sendStatus(400);
                }
                if(suggestionViewData){
                  res.status(200).json({
                    message:Cmessage.viewsuggestion.ALREADY_VIEWED_SUGGESTION,
                    status:Cmessage.condition.FALSE
                  });
                }else{
                  var newSuggestionView = new SuggestionView();
                  newSuggestionView.suggestionId = suggestion_id;
                  newSuggestionView.userId = user_id;
                  newSuggestionView.createdDate = Requested_At;
                  newSuggestionView.save(function(err,insertsuggestionView){
                    if(err){
                      return res.sendStatus(400);
                    }
                    if(insertsuggestionView){
                      res.status(200).json({
                        message:Cmessage.viewsuggestion.VIEW_SUCCESS,
                        status:Cmessage.condition.TRUE
                      });
                    }
                  }); // End Insert Suggestion Views
                }
              }); 
              //End Suggestions and Users for Given Suggestion View
                
              /* SEND PUSH NOTIFICATION TO POSTED_BY USER*/  
              /*
              User.findOne({_id:posted_by},function(err,usertoken){
              var usestoken = usertoken.token;
                if(usestoken && usestoken!= '' && user_id != posted_by){
                    //Get device_type and username one liked the suggestion 
                    User.findOne({_id:user_id},function(err,userdata){
                      var fromName = userdata.userName;
                      //Get devicetype from users collection one that is postedby user
                      var device_type = usertoken.deviceType;
                      //get from name
                      var typess = '';
                      var token = usestoken;
                      var locationdata = location;   
                      Suggestion.find({_id:suggestion_id},function(err,suggestions){
                      if(err){
                        console.log(err);
                      }
                        var suggestions_data  = [];
                        suggestions.forEach(function(suggestion){
                          suggestions_data.push({
                            'aws_file_url':suggestion.awsFileUrl,
                            'aws_thumbnail_url':suggestion.awsThumbnailUrl,
                            'lat':suggestion.lat,'long':suggestion.long,                            
                            'user_id' : user_id,
                            'username' : fromName                            
                          });
                        });
                        
                     
                      if(device_type == 'IPHONE'){
                          var message = fromName+'  viewed your suggestion';
                          var options = {
                            cert: config.apns.certificate,
                            key: config.apns.key,
                            gateway: config.apns.apn_getway,
                            port: config.apns.apn_port
                          };
                           
                          var apnConnection = new apn.Connection(options);
                          console.log('ApnConnections'+apnConnection);
                          apnConnection.on("connected", function() {
                              console.log("Connected");
                          });

                          apnConnection.on("sent", function() {
                              console.log("sent");
                          });

                          apnConnection.on("error", function() {
                              console.log("error");
                          });
                          console.log('IPHONR MEDSSAE'+message);
                          var myDevice = new apn.Device(token);

                          var note = new apn.Notification();

                          var payload = {
                            'suggestion': suggestions_data,
                            'suggestion_id' : suggestion_id.toString(),
                            'location' : locationData[0],                            
                            'type' : 1,
                          };

                          note.badge = 3;
                          note.sound = "default";
                          note.alert =  message;                         
                          note.payload =  payload;

                          apnConnection.pushNotification(note, myDevice);
                          console.log(note);    
                      }else{
                        var message = fromName+' viewed your suggestion'
                          var regTokens = [];
                          regTokens.push(token);
                          console.log('Registered Tokens'+regTokens);
                         
                          // initialize new androidGcm object 
                          var gcmObject = new gcm.AndroidGcm('AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc');
                           
                          // create new message 
                          var message = new gcm.Message({
                              registration_ids: regTokens,
                              data: {
                                "message" : {'message':message,
                                "type":1,
                                "suggestion_id": suggestion_id, 
                                "user_id":user_id,
                                "username":fromName,
                                "location":locationData[0],
                                "suggestion":suggestions_data 
                                }                                         
                              }
                          });

                          gcmObject.send(message, function(err, response) {
                            if(err) console.error(err);
                              else    console.log(response);
                          });
                        
                       }
                    }); 

                    }); //End User Data for user_id
                  }
                });  //End User Data for posted_by
                */
            }else{
                res.status(200).json({
                  message:Cmessage.parameters.PROPER_VALUE,
                  status:Cmessage.condition.FALSE
                });
            }     

            }); //End Suggestion View Data    
        } //If suggestion and user are found
        if(!suggestionsData){
          res.status(200).json({
            message:Cmessage.viewsuggestion.SUGG_NOT_FOUND,
            status:Cmessage.condition.FALSE
          });
        }
      }); //End Suggestion Data
        if(!userData){
          res.status(200).json({
            message:Cmessage.viewsuggestion.USER_NOT_FOUND,
            status:Cmessage.condition.FALSE
          }); 
        }
    });//End User Data
  }else{
    res.status(200).json({
        message:Cmessage.parameters.PROPER_VALUE,
        status:Cmessage.condition.FALSE
    });
  }
  
};

//28th api suggestion Like list 
exports.suggestionLikelist = function(req,res){
  var suggestion_id = (req.body.suggestion_id)?req.body.suggestion_id.trim():'';
  if(suggestion_id){
    Suggestion.find({_id:suggestion_id}).count().exec(function(err,suggestionExist){
        if(err){
          return res.sendStatus(400);
        }  
        if(suggestionExist){
          SuggestionLike.find({suggestionId:suggestion_id}).populate('userId').exec(function(err,suggestionlikeLists){
            if(err){
              return res.sendStatus(400);
            }
            if(suggestionlikeLists){
              var results = [];
              suggestionlikeLists.forEach(function(suggestionlikeList){
                var Photo = (suggestionlikeList.userId.photo)?suggestionlikeList.userId.photo:'';
                results.push({ 
                              'UserId':suggestionlikeList.userId._id.toString(),
                              'UserName':suggestionlikeList.userId.userName,
                              'Photo':Photo
                            });
                });
           
                res.status(200).json({
                  data:results,
                  totalLikes:suggestionlikeLists.length,
                  message:Cmessage.suggestionlikelist.SUCCESS,
                  status:Cmessage.condition.TRUE
                });

            }else{
              res.status(200).json({
                message:Cmessage.suggestionlikelist.NO_RESULT,
                status:Cmessage.condition.FALSE
              });
            }
          }); //End Suggestion Like Datas
        }else{   //If suggestion is not found
          res.status(200).json({
            message:Cmessage.suggestionlikelist.SUGG_NOT_FOUND,
            status:Cmessage.condition.FALSE
          });
        }
    }); //End Suggestion Data
  }else{
    res.status(200).json({
      message:Cmessage.parameters.PROPER_VALUE,
      status:Cmessage.condition.FALSE
    });
  }
};

//54th Api Suggestion View List
exports.suggestionViewList = function(req,res){
  var suggestion_id = (req.body.suggestion_id)?req.body.suggestion_id.trim():'';
  if(suggestion_id){
    Suggestion.find({_id:suggestion_id}).count().exec(function(err,doc){
        if(err){
          return res.sendStatus(400);
        }  
        var suggestion_exist = doc;
        if(suggestion_exist){
          SuggestionView.find({suggestionId:suggestion_id}).populate('userId').exec(function(err,suggestionviewLists){
            if(err){
              return res.sendStatus(400);
            }
            if(suggestionviewLists){
              var results = [];
              suggestionviewLists.forEach(function(suggestionviewList){
                var Photo = (suggestionviewList.userId.photo)?suggestionviewList.userId.photo:'';
                results.push({ 
                              'UserId':suggestionviewList.userId._id.toString(),
                              'UserName':suggestionviewList.userId.userName,
                              'Photo':Photo
                            });
              });
           
                res.status(200).json({
                  data:results,
                  totalViews:suggestionviewLists.length,
                  message:Cmessage.suggestionviewlist.SUCCESS,
                  status:Cmessage.condition.TRUE
                });

          }
          else{
              res.status(200).json({
                message:Cmessage.suggestionviewlist.NO_RESULT,
                status:Cmessage.condition.FALSE
              });
          }
        }); //End suggestion View Data
      }else{   //If suggestion is not found
        res.status(200).json({
          message:Cmessage.suggestionviewlist.SUGG_NOT_FOUND,
          status:Cmessage.condition.FALSE
        });
      }
    }); //End Suggestion Data
  }else{
    res.status(200).json({
      message:Cmessage.parameters.PROPER_VALUE,
      status:Cmessage.condition.FALSE
    });
  }
};

//29th Api add comments 
exports.addsuggestionComments = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id.trim():'';
  var comments = (req.body.comments)?req.body.comments.trim():'';
  var suggestion_id = (req.body.suggestion_id)?req.body.suggestion_id.trim():'';
  var datetime = moment().format('YYYY-MM-DD HH:mm:ss');

  if(suggestion_id && user_id && comments){

    //Get User
    User.findOne({_id:user_id}).exec(function(err,user){
      if(err){
        return res.sendStatus(400);
      }
      //Get Suggestion
      Suggestion.findOne({_id:suggestion_id},function(err,suggestion){
        if(err){
          return res.sendStatus(400);
        }

        if(user && suggestion)
        {
            var posted_by = suggestion.postedBy;
            var created_at = suggestion.createdAt;
            var location = suggestion.location;
            var locationData = location.split(',');

            //Insert Comment
            var newSuggestionComment = new SuggestionComment();
            newSuggestionComment.suggestionId = suggestion_id;
            newSuggestionComment.userId = user_id;
            newSuggestionComment.comments = comments;
            newSuggestionComment.createdDate = datetime;          
            newSuggestionComment.save(function(err,suggcoment){
              if(err){
                return res.sendStatus(400);
              }
              if(suggcoment){

                //Get Suggestion User
                User.findOne({_id:posted_by}).exec(function(err,suggestionUsers){
                  if(err){
                    return res.sendStatus(400);
                  }

                  var photo = (suggestionUsers.photo)?suggestionUsers.photo : '';
                  var usertoken = {
                    token : suggestionUsers.token,
                    UserName : suggestionUsers.userName,
                    device : suggestionUsers.deviceType,
                    Photo : photo
                  }; 

                  //Get Commented User
                  User.findOne({_id:user_id}).exec(function(err,commentedUser){
                    if(err){
                      return res.sendStatus(400);
                    }

                    if(commentedUser)
                    {
                      var fromName = commentedUser.userName;
                    }

                    //Count Suggestion Comment
                    SuggestionComment.find({suggestionId:suggestion_id}).count().exec(function(err,countSuggestionComment){
                      if(err){
                        return res.sendStatus(400);
                      }

                      // Send Notification TO Suggestion User
                      if(usertoken.token && usertoken.token != '' && user_id != posted_by)
                      {
                        var device_type = usertoken.device;
                        var usertokens  = usertoken.token;
                        var typess      = "";

                        // Get Suggestion Data
                        Suggestion.findOne({_id:suggestion_id},function(err,suggestion){
                          if(err){
                            console.log(err);
                          }

                          var suggestions_data = [];
                          suggestions_data.push({
                           'aws_file_url':suggestion.awsFileUrl,
                           'aws_thumbnail_url':suggestion.awsThumbnailUrl,
                           'lat':suggestion.lat,
                           'long':suggestion.long 
                          });

                          if(device_type == 'IPHONE'){
                            var message     = fromName+' commented on your suggestion';
                            var options = {
                              cert: config.apns.certificate,
                              key: config.apns.key,
                              gateway: config.apns.apn_getway,
                              port: config.apns.apn_port
                            };

                             
                            var apnConnection = new apn.Connection(options);
                            console.log('ApnConnections'+apnConnection);
                            apnConnection.on("connected", function() {
                                console.log("Connected");
                            });

                            apnConnection.on("sent", function() {
                                console.log("sent");
                            });

                            apnConnection.on("error", function() {
                                console.log("error");
                            });
                            console.log('IPHONR MEDSSAE'+message);
                            var myDevice = new apn.Device(usertokens);

                            var note = new apn.Notification();
                            //note.badge = 3;

                            var payload = {
                              'suggestion' : suggestions_data,
                              'suggestion_owner_username' : usertoken.UserName,
                              'suggestion_owner_photo' : usertoken.Photo,
                              'suggestion_id' : suggestion_id,
                              'location' : locationData[0],
                              'count_comments' : countSuggestionComment.toString(), 
                              'type' : 2
                            };

                            note.sound    = "default";
                            note.alert    =  message;
                            note.payload  =  payload;                                  

                            apnConnection.pushNotification(note, myDevice);
                            console.log(note);    
                          }else{
                              var message     = fromName+' commented on your suggestion';
                              console.log(message);
                              var regTokens = [];
                              regTokens.push(usertokens);
                              console.log('Registered Tokens'+regTokens);
                              // initialize new androidGcm object 
                              var gcmObject = new gcm.AndroidGcm('AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc');
                              var message = new gcm.Message({
                                  registration_ids: regTokens,
                                  data: {
                                    "message" : {
                                                'message':message,
                                                'type':2,
                                                'suggestion_id' : suggestion_id,
                                                'user_id' : user_id,
                                                'suggestion_owner_user_id' : posted_by,
                                                'suggestion_owner_photo' : usertoken.Photo,
                                                'suggestion_owner_username' : usertoken.UserName,
                                                'username' : fromName,
                                                'count_comments' : countSuggestionComment,
                                                'location':locationData[0],
                                                'suggestion':suggestions_data
                                    }
                                  }
                              });

                              gcmObject.send(message, function(err, response) {
                                if(err) console.error(err);
                                  else    console.log(response);
                              });
                          }

                        });
                        // End Get Suggestion Data

                      }
                      // End Send Notification TO Suggestion User

                      // Send Notification TO All
                      SuggestionComment.find({
                      $and:[
                        {suggestionId:suggestion_id},{userId:{$ne:posted_by}}
                      ]}).populate('userId').distinct('userId').exec(function(err,userData){
                        if(err){
                          console.log(err);
                        }
                        console.log(userData);
                        if(userData){
                          User.find({_id:{$in:userData}}).select('_id token deviceType').exec(function(err,users){
                            if(err){
                              console.log(err);
                            }
                            if(users){

                              // Get Suggestion Data
                              Suggestion.findOne({_id:suggestion_id},function(err,suggestion){
                                if(err){
                                  console.log(err);
                                }

                                var suggestions_data = [];
                                suggestions_data.push({
                                 'aws_file_url':suggestion.awsFileUrl,
                                 'aws_thumbnail_url':suggestion.awsThumbnailUrl,
                                 'lat':suggestion.lat,
                                 'long':suggestion.long 
                                });

                                users.forEach(function(user){                                  
                                  var usersid = user._id;
                                  if(usersid != user_id){
                                    var device_type = user.deviceType;
                                    var token = user.token;
                                   
                                      if(device_type == 'IPHONE'){
                                        var message     = fromName+' commented on your suggestion';
                                        var options = {
                                          cert: config.apns.certificate,
                                          key: config.apns.key,
                                          gateway: config.apns.apn_getway,
                                          port: config.apns.apn_port
                                        };

                                         
                                        var apnConnection = new apn.Connection(options);
                                        
                                        apnConnection.on("connected", function() {
                                            console.log("Connected");
                                        });

                                        apnConnection.on("sent", function() {
                                            console.log("sent");
                                        });

                                        apnConnection.on("error", function() {
                                            console.log("error");
                                        });
                                       
                                        var myDevice = new apn.Device(token);

                                        var note = new apn.Notification();
                                        //note.badge = 3;

                                        var payload = {
                                          'suggestion_id' : suggestion_id,
                                          'user_id' : user_id,
                                          'suggestion_owner_user_id' : posted_by,
                                          'suggestion_owner_photo' : usertoken.Photo,
                                          'suggestion_owner_username' : usertoken.UserName,
                                          'username' : fromName,
                                          'count_comments' : countSuggestionComment.toString(),
                                          'location' : locationData[0],
                                          'suggestion' : suggestions_data,
                                          'type' : 2
                                        };
                                        
                                        note.sound = "default";
                                        note.alert =  message;
                                        note.payload =  payload;

                                        apnConnection.pushNotification(note, myDevice);
                                        
                                      }else{

                                       var message = fromName+' commented on your suggestion';
                                        var regTokens = [];
                                        regTokens.push(token);
                                        
                                        // initialize new androidGcm object 
                                        var gcmObject = new gcm.AndroidGcm('AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc');
                                         
                                        // create new message 
                                        var message = new gcm.Message({
                                            registration_ids: regTokens,
                                            data: {
                                              "message" : {
                                                          'message':message,
                                                          'type':2,
                                                          'suggestion_id' : suggestion_id,
                                                          'user_id' : user_id,
                                                          'suggestion_owner_user_id' : posted_by,
                                                          'suggestion_owner_photo' : usertoken.Photo,
                                                          'suggestion_owner_username' : usertoken.UserName,
                                                          'username' : fromName,
                                                          'count_comments' : countSuggestionComment,
                                                          'location':locationData[0],
                                                          'suggestion':suggestions_data
                                                           //Push notifiation for location is left}
                                              }
                                            }
                                        });

                                        gcmObject.send(message, function(err, response) {
                                          if(err) console.error(err);
                                            else    console.log(response);
                                        });   
                                      }
                                  }
                                }); //For each users
                              });
                            }
                          });
                        }

                      });
                      // End Send Notification TO All

                    });
                    //End Count Suggestion Comment
                  });
                  //End Get Commented User

                });
                //End Get Suggestion User

                res.status(200).json({
                  comment_id:suggcoment._id,
                  message:Cmessage.addsuggestioncomment.COMMENT_ADD,
                  status:Cmessage.condition.TRUE
                });     
              }
              
          }); //End Of Insert Comment
        }else{
          //If Suggestion Not Founnd
          if(!suggestion)
          {
            res.status(200).json({
              message:Cmessage.addsuggestioncomment.SUGG_NOT_FOUND,
              status:Cmessage.condition.FALSE
            });
          }else{
            //Else User Not Founnd
            res.status(200).json({
              message:Cmessage.addsuggestioncomment.USER_NOT_FOUND,
              status:Cmessage.condition.FALSE
            });
          }
        }
      }); // End Get Suggestion
    }); // End Get User

  }else{    //Parameters is incorrect
    res.status(200).json({
      message:Cmessage.parameters.PROPER_VALUE,
      status:Cmessage.condition.FALSE
    });
  }

};

//30th Api delete suggestion comments
exports.deletesuggestionComments = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id:'';
  var comment_id = (req.body.comment_id)?req.body.comment_id:'';
  var suggestion_id = (req.body.suggestion_id)?req.body.suggestion_id:'';

  if(suggestion_id && user_id && comment_id){
     //Get User
    User.findOne({_id:user_id}).count().exec(function(err,user){
      if(err){
        return res.sendStatus(400);
      }
      //Get Suggestion
      Suggestion.findOne({_id:suggestion_id},function(err,suggestion){
        if(err){
          return res.sendStatus(400);
        }
        if(user && user > 0 && suggestion){
          //Start Suggestion Comments
          SuggestionComment.findOne({_id:comment_id}).populate('suggestionId').populate('userId').exec(function(err,selsuggestionComments){
            if(err){
              return res.sendStatus(400);
            }
            if(selsuggestionComments){
              if(selsuggestionComments.suggestionId.postedBy == user_id || selsuggestionComments.userId._id == user_id){
                //Remove Suggestion Comments
                SuggestionComment.remove({_id:comment_id},function(err,deletesuggestionComment){
                  if(err){
                    return res.sendStatus(400);
                  }
                  if(deletesuggestionComment){
                    res.status(200).json({
                      message:Cmessage.delsuggestioncomment.COMMENT_DEL,
                      status:Cmessage.condition.TRUE
                    });
                  }
                }); //End Remove Suggestion Comments
              }else{
                res.status(200).json({
                  message:Cmessage.delsuggestioncomment.NOT_AUTH_DEL_COMMENT,
                  status:Cmessage.condition.FALSE
                });
              }
            }else{
              res.status(200).json({
                message:Cmessage.delsuggestioncomment.NO_RECORD,
                status:Cmessage.condition.FALSE
              });
            }
          }); //End the Suggestion Comments
        }else{  //If both suggestion and user exists
          if(!suggestion){
            res.status(200).json({
              message:Cmessage.delsuggestioncomment.SUGG_NOT_FOUND,
              status:Cmessage.condition.FALSE
            });
          }else{
            res.status(200).json({
              message:Cmessage.delsuggestioncomment.USER_NOT_FOUND,
              status:Cmessage.condition.FALSE
            });
          }
        } 
      }); //End Suggestion
    }); // End User
  }else{
    res.status(200).json({
      message:Cmessage.parameters.PROPER_VALUE,
      status:Cmessage.condition.FALSE
    });
  }
};

//31st Api suggestioncomments listing
exports.suggestioncommentsListing = function(req,res){
  var suggestion_id = (req.body.suggestion_id)?req.body.suggestion_id:'';
  var start = (req.body.start)?req.body.start:0; //defaultvalue start = 0
  var count = (req.body.count)?req.body.count:10;  //defaultvalue count = 10
  start = parseInt(start);
  count = parseInt(count);

  if(suggestion_id){
    //Start Suggestion
    Suggestion.findOne({_id:suggestion_id},function(err,suggestion){
      if(err){
        return res.sendStatus(400);
      }
      if(suggestion){
          //Start Suggestion Comment
          SuggestionComment.find({suggestionId:suggestion_id})
                          .populate('suggestionId')
                          .populate('userId')
                          .sort({createdDate:1})                          
                          .exec(function(err,suggestioncomments){

            if(err){
              return res.sendStatus(400);
            }
            //console.log(suggestioncomments);
            if(suggestioncomments && suggestioncomments.length > 0){
               var results = [];
              suggestioncomments.forEach(function(suggestioncomment){
               
                var photo = (suggestioncomment.userId.photo)?suggestioncomment.userId.photo :'';
                  
                  results.push({'comment_id':suggestioncomment._id.toString(),
                                'created_date':moment(suggestioncomment.createdDate).format('YYYY-MM-DD HH:mm:ss'),
                                'UserId':suggestioncomment.userId._id.toString(),
                                'UserName':suggestioncomment.userId.userName,
                                'Photo':photo,
                                comments:suggestioncomment.comments
                  });
              });

              results = results.sort(function(a, b) {
                var sortResult = new Date(b.created_date) - new Date(a.created_date);
                if (sortResult == 0) {
                  return b.comment_id - a.comment_id;
                }
                return sortResult;              
              });
              
              results = results.slice(start,count);              

              //console.log(results);
              res.status(200).json({
                data:results,
                totalComments:suggestioncomments.length,
                message:Cmessage.suggestioncommentslisting.SUCCESS_FETCH,
                status:Cmessage.condition.TRUE
              });
            }else{
              res.status(200).json({
                message:Cmessage.suggestioncommentslisting.NO_COMMENT,
                status:Cmessage.condition.TRUE
              });
            }
          }); //End Suggestion Comments                 

      }else{
         res.status(200).json({
              message:Cmessage.delsuggestioncomment.SUGG_NOT_FOUND,
              status:Cmessage.condition.FALSE
        });
      }
    }); //End Suggestion 
  }else{
    res.status(200).json({
      message:Cmessage.parameters.PROPER_VALUE,
      status:Cmessage.condition.FALSE
    });
  }
};


//32nd api Filter Instant suggestion 
exports.filterinstantSuggestion = function(req,res){
  var loginid = (req.body.loginid)?req.body.loginid.trim():'';
  var timezone = (req.body.timezone)?req.body.timezone.trim():'+00:00';

  if(timezone.indexOf('\\') > -1)
  {
    timezone = timezone.replace(/\\/g, '');  
  }

  var titlelocation = (req.body.titlelocation)?req.body.titlelocation.trim():'';
  var category = (req.body.category)?req.body.category.trim():'';
  var type = (req.body.type)?req.body.type.trim():'';
  var start = (req.body.start)?req.body.start:0; //defaultvalue start = 0
  var count = (req.body.count)?req.body.count:10;  //defaultvalue count = 10
  start = parseInt(start);
  count = parseInt(count);

  if(loginid && timezone){

    var condition = [];
    condition.push({suggestionType:'Instant'});
    if(category && category != '')
    {
      condition.push({category:category});
    }
    if(type && type != '')
    {
      condition.push({type:type});
    }
    if(titlelocation && titlelocation != '')
    {
      condition.push({location:{'$regex': titlelocation}});
    }
    condition.push({postedBy:loginid});

    //START Get Suggestion 
    Suggestion.find({$and:condition})
    .populate('postedBy').populate('type').populate('category').sort({createdAt:1})    
    .exec(function(err,suggestions){
      if(err){
        return res.sendStatus(400);
      }
      if(suggestions && suggestions.length > 0){
        //console.log(suggestions.length);
        var data = [];
       
        async.each(suggestions,function(suggestion,asyncCallback){
          //Get Suggestion View Count
          SuggestionView.find({suggestionId:suggestion_id}).count().exec(function(err,suggviewCount){
            if(err){
              return asyncCallback(err); 
            }
            var count_views = suggviewCount;
            // Start Suggestion View User Count
            SuggestionView.find({$and:[
                  {suggestionId:suggestion_id},
                  {userId:loginid}
                ]}).count().exec(function(err,suggviewuserCount){
              if(err){                     
                return asyncCallback(err); 
              }
            var view_flag = suggviewuserCount;

          SuggestionLike.find({suggestionId:suggestion._id}).count().exec(function(err,countsugglike){
            if(err){
              console.log(err);
              return asyncCallback(err);  
            }

            var count_likes = countsugglike;
          SuggestionLike.find({$and:[
                {suggestionId:suggestion._id},
                {userId:loginid}
            ]}).count().exec(function(err,countsugguserlike){
              if(err){
                console.log(err);
                return asyncCallback(err);  
              }
            var like_flag = countsugguserlike;

          SuggestionComment.find({suggestionId:suggestion._id}).count().exec(function(err,countSuggestionComment){
              if(err){
                console.log(err);
                return asyncCallback(err);  
              }

              var commentList = [];
              SuggestionComment.find({suggestionId:suggestion._id})
                  .populate('suggestionId')
                  .populate('userId').limit(10)
                  .exec(function(err,suggcommentsData){
                      if(err){
                        console.log(err);
                        return asyncCallback(err);  
                      }

                      if(suggcommentsData && suggcommentsData.length > 0)
                      {
                        suggcommentsData.forEach(function(suggcommentData){

                          var photo = (suggcommentData.userId.photo)?suggcommentData.userId.photo : '';
                          commentList.push({'comment_id':suggcommentData._id,'created_date':suggcommentData.createdDate,
                                          'UserId':suggcommentData.userId._id,'UserName':suggcommentData.userId.userName,
                                          'Photo':photo,'comments':suggcommentData.comments});
                        });
                        
                        var recent_comments = commentList;                                                                            
                      }else{
                        var recent_comments = Cmessage.filtersuggestion.NO_COMMENT;
                      }
                     
                      if(suggestion.category && suggestion.type){ 
                        var count_comments = countSuggestionComment;
                        var awsFileUrl =  (suggestion.awsFileUrl)?suggestion.awsFileUrl:'';
                        var categoryTitle = (suggestion.category)?suggestion.category:'';
                        var typeName = (suggestion.type)?suggestion.type:'';
                        var awsThumbnailUrl = (suggestion.awsThumbnailUrl)?suggestion.awsThumbnailUrl:'';
                        var awsMinithumbUrl = (suggestion.awsMinithumbUrl)?suggestion.awsThumbnailUrl:'';
                        var product_url =(suggestion.product_url)?suggestion.product_url:'';
                        var photo = (suggestion.photo)?suggestion.photo : '';
                        //var createdAt = moment(suggestion.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD');
                        var createdAt = moment(suggestion.createdAt).tz(timezone).format('YYYY-MM-DD');
                       // console.log(createdAt);
                        
                        data.push({'suggestionId':suggestion._id,'title':suggestion.title,'caption':suggestion.caption,
                                  'file':awsFileUrl,'fileshare':'','type':typeName,'category':categoryTitle,
                                  'thumbnail':awsThumbnailUrl,'thumb':awsMinithumbUrl,'location':suggestion.location,
                                  'lat':suggestion.lat,'long':suggestion.long,'reported':0,'toSuggestThat':suggestion.toSuggestthat,
                                  'UserId':suggestion.postedBy._id,'UserName':suggestion.postedBy.userName,'product_url':product_url,
                                  'Photo':photo,'created_at':createdAt,'count_likes':count_likes,'like_flag':like_flag,
                                  'count_views':count_views.toString(),'view_flag':view_flag.toString(),
                                  'count_comments':count_comments,recent_comments
                        });
                      asyncCallback();
                    }else{
                      asyncCallback();
                    }

              }); //End Suggestion Comment Data      
          }); // End SuggestionComment Count 
          }); // End Specific User SuggestionLike Count
          }); // End SuggestionLike count
          }); //End Suggestion View User Data
          }); //End Suggestion View Count
          
        },function(err){

            if(data && data.length > 0)
            {
              data = data.sort(function(a, b) {
                var sortResult = new Date(b.created_at) - new Date(a.created_at);
                if (sortResult == 0) {
                  return b.suggestionId - a.suggestionId;
                }
                return sortResult;              
              });

              var totalrecord = data.length;
              count = start + count;
              data = data.slice(start,count);

              res.status(200).json({
                AllSuggestions:data,
                totalrecord:totalrecord,
                message:'Suggestion Found',
                AllSuggestionsAck:Cmessage.condition.TRUE
              });  
            }else{
              res.status(200).json({
                message:Cmessage.filterinstantsuggestion.SUGG_NOT_FOUND,
                AllSuggestionsAck:Cmessage.condition.FALSE
              });      
            }
               
        });
      }else{
        res.status(200).json({
            message:Cmessage.filterinstantsuggestion.SUGG_NOT_FOUND,
            AllSuggestionsAck:Cmessage.condition.FALSE
        });
      }
    });// End Get suggestion
      
  }else{
    res.status(200).json({
      message:Cmessage.parameters.PROPER_VALUE,
      status:Cmessage.condition.FALSE
    });
  }

};

//33rd Api Alert count Background Webservice
exports.bgviewRequest = function(req,res){
   var id = req.body.id?req.body.id:'';
   if(id && id!== ''){
       //ALERT COUNT FOR FRIEND REQUEST Get Friend Request
      Request.find({$and:[
                {requestToId:id},
                {status:'pending'},
                {lastAlertViewed:"0000-00-00 00:00:00"}
              ]}).count().exec(function(err,reqcount){
        if(err){
          console.log(err);
        }
        var friendrequest_count = reqcount;          

      //ALERT COUNT FOR INSTANT SUGGESTION Get Suggestion Map Data
      SuggestionMap.find({$and:[
                    {postedTo:id},
                    {lastAlertViewed:"0000-00-00 00:00:00"}
        ]}).populate({
            path:'suggestionId',
            match:{suggestionType:'Instant'}
        }).exec(function(err,suggestionmap){
          if(err){
            console.log(err);
          }
          var count = 0;
          suggestionmap.forEach(function(suggestion){
            if(suggestion.suggestionId!== null){
                count++;
            }
          });
          var instantsuggestion_count = count;

        //ALERT COUNT FOR Comments Get SuggestionComment
        SuggestionComment.find({$and:[
              {lastAlertviewed:'0000-00-00 00:00:00'},
              {userId:{$ne:id}}
            ]})
            .populate({path:'suggestionId'})
            .populate('userId').sort({createdDate:1})
            .exec(function(err,suggcommentCount){
              if(err){
                return res.sendStatus(400);
              }
              //console.log(suggcommentCount);
              var comment_count = 0;
              suggcommentCount.forEach(function(sc){
			  //condition for If suggetions are not exist
			  if(sc.suggestionId != null && sc.suggestionId!=''){
					if(sc.suggestionId.postedBy == id)
					{
					  comment_count++;
					}
				}
              });

         //ALERT COUNT FOR LIKE Get Suggestion Like Data
        SuggestionLike.find({$and:[
                  {userId:{$ne:id}},
                  {lastAlertviewed:'0000-00-00 00:00:00'}
            ]}).populate({
                path:'suggestionId'                
              })
              .populate('userId').sort({createdDate:1})
              .exec(function(err,sugglikeCount){
              if(err){
                return res.sendStatus(400);
              }

              var like_count =  0;              
              sugglikeCount.forEach(function(sl){

                if(sl.suggestionId != null && sl.suggestionId.postedBy == id)
                {
                  like_count++;
                }
              });
              
          //ALERT COUNT FOR VIEW Get Suggestion View Data

        SuggestionView.find({$and:[
                  {userId:{$ne:id}},
                  {lastAlertviewed:'0000-00-00 00:00:00'}
                ]})
                .populate({path:'suggestionId'})
                .populate('userId').sort({createdDate:1})
                .exec(function(err,suggviewCount){
              if(err){
                return res.sendStatus(400);
              }
              var view_count = 0;
              suggviewCount.forEach(function(sv){
			  if(sv.suggestionId!=null && sv.suggestionId!=''){
                if(sv.suggestionId.postedBy == id)
					{
					  view_count++;
					}
				}
              });              
              
        //[NOTICNT] ALERT COUNT FOR REQUEST ARRIVED [2015-08-01]
        GroupMember.find({$and:[
                {toUserId:id},
                {status:'0'}  ////Only deleted status data not display
              ]})
            .populate('groupId')
            .populate('fromUserId')
            .count()  
            .exec(function(err,groupCount){
              if(err){
                return res.sendStatus(400);
              }
              var request_count = groupCount;                            

          var final_count =friendrequest_count+ comment_count+view_count+like_count+request_count;
          if(final_count && final_count > 0){

            res.status(200).json({
              AllTotal:final_count,
              friendrequest_count:friendrequest_count.toString(),
              instantsuggestion_count:instantsuggestion_count.toString(),
              like_comment_count:comment_count + like_count,
              view_count:view_count,
              group_request_count:request_count,
              message:Cmessage.bgviewrequest.ALERT_FOUND,
              AlertAck:Cmessage.condition.TRUE
            });
          }else{
            
            res.status(200).json({
                message:Cmessage.bgviewrequest.NO_ALERT_FOUND,
                AlertAck:Cmessage.condition.FALSE
            });
          }
    }); //End Of Group Member Data
    }); //End Suggestion View Data
    }); //End SuggestionLike Data
    });// End SuggestionCommennt Data           
    }); // End INSTANT SUGGESTION Map Data
    }); //End Request Data

  }else{
    res.status(200).json({
        message:Cmessage.parameters.MESSAGE,
        AlertAck:Cmessage.condition.FALSE
    });
  }
};

//34. Comment & Like list with pagination
exports.commentLikelist = function(req,res){

  //var format = 'YYYY/MM/DD HH:mm:ss ZZ';
  //var t =  moment("2015-03-16 15:56:27", format).tz("+5:30").format(format);
  //console.log(moment().tz.guess());
  //moment().utcOffset("+08:00").guess();
  //var t = moment.tz("2015-03-16 15:56:27", "+5:30").format('YYYY-MM-DD HH:mm:ss');   
  //var t = moment("2015-03-16 15:56:27").tz('America/Chicago').format('YYYY-MM-DD HH:mm:ss');
  
  var id = (req.body.id)?req.body.id:'';
  var update_flag = (req.body.update_flag)?req.body.update_flag:0;
  var timezone = (req.body.timezone)?req.body.timezone:'+00:00';

  if(timezone.indexOf('\\') > -1)
  {
    timezone = timezone.replace(/\\/g, '');  
  }


  var start = (req.body.start)?req.body.start:0;
  var count = (req.body.count)?req.body.count:10;
  var created_date = moment().format('YYYY-MM-DD HH:mm:ss');

  start = parseInt(start);
  count = parseInt(count);
  if(id && id!== '' && update_flag && timezone && timezone!==''){
    
    //Update Flag condition value to 1
      if(update_flag == 1){
      
        //Update user Suggestion Like
        SuggestionLike.find(
          {lastAlertviewed:'0000-00-00 00:00:00'}
        ).populate('suggestionId').exec(function(err,sugglikes){
              if(err){
                console.log(err);
              }
             
              sugglikes.forEach(function(sugglike){
                if(sugglike.suggestionId != null && sugglike.suggestionId.postedBy == id){
                  sugglike.lastAlertviewed = created_date;
                  sugglike.save();
              //    console.log(sugglike);
                }
              });
          }); // End Suggestion Like
        //Update User Suggestion Comment
        SuggestionComment.find({lastAlertviewed:'0000-00-00 00:00:00'})
          .populate('suggestionId').exec(function(err,suggcomments){
              if(err){
                return res.sendStatus(400);
              }
              
              suggcomments.forEach(function(suggcomment){
                if(suggcomment.suggestionId != null && suggcomment.suggestionId.postedBy == id){
                  suggcomment.lastAlertviewed = created_date;
                  suggcomment.save();
           //       console.log(suggcomment);
                }
              });
        }); // End Suggestion Comment
        SuggestionView.find({lastAlertviewed:'0000-00-00 00:00:00'})
          .populate('suggestionId').exec(function(err,suggviews){
              if(err){
                return res.sendStatus(400);
              }
              suggviews.forEach(function(suggview){
                if(suggview.suggestionId != null && suggview.suggestionId.postedBy == id){
                  suggview.lastAlertviewed = created_date;
                  suggview.save();
              //    console.log(suggview);
                }
              });
        }); // End Suggestion Comment

      } //End Update_flag Condition
    
      //Get Suggestion Like User Data
      async.parallel([
        //Collection Of Suggestion Like  Data
        function(callback){
           var sugglikeData = [];
          //START - User Suggestion Like List Data
            SuggestionLike.find({userId:{$ne:id}})
              .populate('suggestionId')
              .populate('userId')
              .sort({createdDate:1})
              .exec(function(err,sugglikeUsers){
                  if(err){
                    console.log(callback(err));
                  }
                  
                  sugglikeUsers.forEach(function(sugglikeUser){                    
                    if(sugglikeUser.suggestionId != null && sugglikeUser.suggestionId.postedBy == id){
                      var photo = sugglikeUser.userId.photo?sugglikeUser.userId.photo:'';
                      var created_date = moment(sugglikeUser.createdDate).tz(timezone).format('YYYY-MM-DD HH:mm:ss'); 
                      //var created_date = moment(sugglikeUser.createdDate).tz('+00:00',timezone).format('YYYY-MM-DD HH:mm:ss');
                      sugglikeData.push({
                          'type':"LIKE",
                          'suggestionId':sugglikeUser.suggestionId._id.toString(),
                          'UserId':sugglikeUser.userId._id.toString(),
                          'UserName':sugglikeUser.userId.userName,
                          'location':sugglikeUser.suggestionId.location,
                          'file':sugglikeUser.suggestionId.awsFileUrl,
                          'image':sugglikeUser.suggestionId.awsThumbnailUrl,
                          'lat':sugglikeUser.suggestionId.lat,
                          'long':sugglikeUser.suggestionId.long,
                          'Photo':photo,
                          'created_date':created_date
                      });
                    }//Condition if id is there in postedBy suggestions
                  });
                   //console.log(sugglikeData);
                    //console.log(sugglikeData);
                    callback(null,sugglikeData);
                  
              }); // End- User Suggestion Like List Data          
        },
         //Collection Of Suggestion Comment  Data
        function(callback){
          var suggcommentData = [];
          SuggestionComment.find({userId:{$ne:id}})
            .populate('suggestionId')
            .populate('userId')
            .sort({createdDate:1})            
            .exec(function(err,suggcommentUsers){
              if(err){
                 console.log(callback(err));
              }

              suggcommentUsers.forEach(function(suggcommentUser){
                  if(suggcommentUser.suggestionId != null && suggcommentUser.suggestionId.postedBy == id){
                    //console.log(suggcommentUser);
                   
                    var photo = suggcommentUser.userId.photo?suggcommentUser.userId.photo:'';
                    //var created_date = moment(suggcommentUser.createdDate).tz('+00:00',timezone).format('YYYY-MM-DD HH:mm:ss');
                    var created_date = moment(suggcommentUser.createdDate).tz(timezone).format('YYYY-MM-DD HH:mm:ss'); 
                    suggcommentData.push({
                        'type':"COMMENT",
                        'suggestionId':suggcommentUser.suggestionId._id.toString(),
                        'UserId':suggcommentUser.userId._id.toString(),
                        'UserName':suggcommentUser.userId.userName,
                        'location':suggcommentUser.suggestionId.location,
                        'file':suggcommentUser.suggestionId.awsFileUrl,
                        'image':suggcommentUser.suggestionId.awsThumbnailUrl,
                        'lat':suggcommentUser.suggestionId.lat,
                        'long':suggcommentUser.suggestionId.long,
                        'Photo':photo,
                        'created_date':created_date
                    });
                  }//Condition if id is there in postedBy suggestions
                });
                  //console.log(suggcommentData);
                  callback(null,suggcommentData);
                  
            });//  End Of Suggcomment List User Data
        },
          //Collection Of Suggestion View  Data
        function(callback){
          var suggviewData = [];
          SuggestionView.find({userId:{$ne:id}})
            .populate('suggestionId')
            .populate('userId')
            .sort({createdDate:1})            
            .exec(function(err,suggviewUsers){
              if(err){
                 console.log(callback(err));
              }
              //console.log(suggcommentUsers);

              suggviewUsers.forEach(function(suggviewUser){
                  if(suggviewUser.suggestionId != null && suggviewUser.suggestionId.postedBy == id){
                    //console.log(suggcommentUser);
                    var photo = suggviewUser.userId.photo?suggviewUser.userId.photo:'';
                    var created_date = moment(suggviewUser.createdDate).tz(timezone).format('YYYY-MM-DD HH:mm:ss'); 
                    //var created_date = moment(suggviewUser.createdDate).tz('+00:00',timezone).format('YYYY-MM-DD HH:mm:ss');
                    suggviewData.push({ 
                        'type':"VIEW",
                        'suggestionId':suggviewUser.suggestionId._id.toString(),
                        'UserId':suggviewUser.userId._id.toString(),
                        'UserName':suggviewUser.userId.userName,
                        'location':suggviewUser.suggestionId.location,
                        'file':suggviewUser.suggestionId.awsFileUrl,
                        'image':suggviewUser.suggestionId.awsThumbnailUrl,
                        'lat':suggviewUser.suggestionId.lat,
                        'long':suggviewUser.suggestionId.long,
                        'Photo':photo,
                        'created_date':created_date
                    });   
                  }//Condition if id is there in postedBy suggestions
                });
                  //console.log(suggcommentData);
                  callback(null,suggviewData);
                  
            });//  End Of Suggcomment List User Data
        }

      ],function(err,results){

          var data = [];
           //console.log(results);
          results.forEach(function(result){                      
            result.forEach(function(r){                                      
              data.push(r);
            });        
          });       

          data = data.sort(function(a, b) {
            var sortResult = new Date(b.created_date) - new Date(a.created_date);
            if (sortResult == 0) {
              return b.suggestionId - a.suggestionId;
            }
            return sortResult;              
          });

          var totalrecord = data.length;
          count = start + count;
          data = data.slice(start,count);
          

          if(data && data.length > 0 ){
             res.status(200).json({
                like_comment:data,
                totalrecord:totalrecord,
                message:Cmessage.commentlikelist.COMMENT_LIKE_FOUND,
                AlertAck:Cmessage.condition.TRUE
              });
          }else{
            
            res.status(200).json({
              like_comment:data,
              message:Cmessage.commentlikelist.COMMENT_LIKE_NOT_FOUND,
              AlertAck:Cmessage.condition.TRUE
            });
          }
      });
  }else{
    res.status(200).json({
      message:Cmessage.parameters.MESSAGE,
      AlertAck:Cmessage.condition.FALSE
    });
  }
  
};

 //35th Api  Instant Suggestion List 
exports.instantsuggestionList = function(req,res){

  var id = (req.body.id)?req.body.id:'';
  var update_flag = (req.body.update_flag)?req.body.update_flag:0;
  var timezone = (req.body.timezone)?req.body.timezone:'+00:00';

  if(timezone.indexOf('\\') > -1)
  {
    timezone = timezone.replace(/\\/g, '');  
  }

  var start = (req.body.start)?req.body.start:0;
  var count = (req.body.count)?req.body.count:10;
  var currentdate = moment().format('YYYY-MM-DD HH:mm:ss');

  if(id && id!== '' && update_flag && timezone && timezone!== ''){
    //Condition if  updateFlag is one
    if(update_flag == 1){
      //console.log('Hello');
      //Update the Suggestion Map lastAlertViewed Data
      SuggestionMap.find({$and:[ 
            {lastAlertViewed:"0000-00-00 00:00:00"},
            {postedTo:id}
            ]})
           .exec(function(err,suggmapData){
        if(err){
          console.log(err);
          return res.sendStatus(400); 
        }
        //console.log(suggmapData);
        if(suggmapData){
          suggmapData.forEach(function(updsuggmap){
            updsuggmap.lastAlertViewed = currentdate;
            updsuggmap.save();
            //console.log(updsuggmap);
          });
        }
      }); //End of Update Suggestion Map Data
    } //End Of update_flag condition
    //Get SuggestionMap Data
    SuggestionMap.find({postedTo:id})
      .populate('suggestionId')
      .exec(function(err,suggmapData){
        if(err){        
          return res.sendStatus(400); 
        }
        //If Get Data        
        if(suggmapData)
        {
          var suggestion_map_data = [];
          async.each(suggmapData,function(sm,asyncCallback){
            if(sm.suggestionId.suggestionType == "Instant")
            { 
              //count_views
              SuggestionView.find({suggestionId:sm.suggestionId._id})
              .count()
              .exec(function(err,count_views){
                //suggestion_view
                SuggestionView.find({suggestionId:sm.suggestionId._id,user_id:id})
                .count()
                .exec(function(err,suggestion_view){             
              //count_likes
              SuggestionLike.find({suggestionId:sm.suggestionId._id})
              .count()
              .exec(function(err,count_likes){
                //suggestion_like
                SuggestionLike.find({suggestionId:sm.suggestionId._id,user_id:id})
                .count()
                .exec(function(err,suggestion_like){
                  //count_comments
                  SuggestionComment.find({suggestionId:sm.suggestionId._id})
                  .count()
                  .exec(function(err,count_comments){
                    //Suggestion Type
                    SuggesstionType.findOne({_id:sm.suggestionId.type})                    
                    .exec(function(err,suggestionType){                        
                      //Category
                      Category.findOne({_id:sm.suggestionId.category})                    
                      .exec(function(err,category){  
                        //Suggestion Report
                        SuggestionReport.find({suggestionId:sm.suggestionId._id})                    
                        .exec(function(err,suggestionReport){  
                          console.log(suggestionReport);
                          //User
                          User.findOne({_id:sm.suggestionId.postedBy})                    
                          .exec(function(err,suggestionUser){    

                            var reported = (suggestionReport.reportFlag)? 1 : 0;

                            var created_date = moment(sm.suggestionId.createdAt).tz(timezone).format('YYYY-MM-DD HH:mm:ss'); 

                            //console.log(sm);
                            suggestion_map_data.push({
                              suggestionId:sm.suggestionId._id.toString(),
                              title:sm.suggestionId.title,
                              caption:sm.suggestionId.caption,
                              count_likes:count_likes.toString(),
                              like_flag:suggestion_like.toString(),
                              count_comments:count_comments.toString(),
                              count_views:count_views.toString(),
                              view_flag:suggestion_view.toString(),
                              file:(sm.suggestionId.file == '') ? sm.suggestionId.file : '',
                              fileshare:'playsuggesthat.php?src='+sm.suggestionId.file+'&sid='+sm.suggestionId._id,
                              type:(sm.suggestionId.type) ? sm.suggestionId.type : '',
                              category:(sm.suggestionId.category) ? sm.suggestionId.category : '',
                              thumbnail:(sm.suggestionId.awsThumbnailUrl) ? sm.suggestionId.awsThumbnailUrl : '',
                              thumb:(sm.suggestionId.awsMinithumbUrl) ? sm.suggestionId.awsMinithumbUrl : '',
                              location:sm.suggestionId.location,
                              lat:sm.suggestionId.lat,
                              long:sm.suggestionId.long,
                              lat:sm.suggestionId.lat,
                              reported:reported.toString(),
                              toSuggestThat:sm.suggestionId.toSuggestthat.toString(),
                              UserId:suggestionUser._id.toString(),
                              UserName:suggestionUser.userName,                              
                              product_url:(sm.suggestionId.product_url) ? sm.suggestionId.product_url : '',
                              created_at: created_date,
                              Photo:(suggestionUser.photo && (suggestionUser.photo != '' || suggestionUser.photo != null)) ? suggestionUser.photo : 'http://suggesthat.com/services/files/user/1442309949079.jpg',
                              recent_comments:Cmessage.filtersuggestion.NO_COMMENT
                            });
                            asyncCallback();
                          });  
                          //End User
                        });
                        //End Suggestion Report  
                      });
                      //End Category
                    });  
                    //End Suggestion Type
                  });
                  //End count_comments
                });
                //End suggestion_like
              });
              //count_likes
            }); //End suggestion_view
            }); //count_views
            }else{
              asyncCallback();
            }               
          },function(err){
            if(suggestion_map_data.length > 0)
            {

              suggestion_map_data = suggestion_map_data.sort(function(a, b) {
                var sortResult = new Date(b.created_at) - new Date(a.created_at);
                if (sortResult == 0) {
                  return b.suggestionId - a.suggestionId;
                }
                return sortResult;              
              });

              var totalrecord = suggestion_map_data.length;
              count = start + count;
              suggestion_map_data = suggestion_map_data.slice(start,count);

              res.status(200).json({
                Instantsuggestion:suggestion_map_data,
                TotalSuggestion:totalrecord,
                message: 'Alert found.',
                AlertAck:'true'
              });
            }else{
              res.status(200).json({
                  Instantsuggestion:[],
                  message:"No alert found.",
                  AlertAck:'true'
              });
            }
          });
                        
        }else{
          res.status(200).json({
              Instantsuggestion:[],
              message:"No alert found.",
              AlertAck:'true'
          });         
        }
        //If Get Data End
    });          
    //End Suggestion Map Data
  }else{
    res.status(200).json({
        message:Cmessage.parameters.MESSAGE,
        AlertAck:Cmessage.condition.FALSE
    });
  }
};

//52nd Api Check Suggestion 
exports.checkSuggestion = function(req,res){
  var suggestion_id = (req.body.suggestion_id)?req.body.suggestion_id:'';
  if(suggestion_id !== ''){
    //Get Suggestion
    Suggestion.findOne({_id:suggestion_id},function(err,suggData){
        if(err){
          return res.sendStatus(400);
        }
        if(suggData){
          res.status(200).json({
            message:Cmessage.checksuggestion.SUGGESTION_EXISTS,
            exists_flag:1,
            Ack:Cmessage.condition.TRUE
          });
        }else{
          res.status(200).json({
            message:Cmessage.checksuggestion.SUGGESTION_NOT_EXISTS,
            exists_flag:0,
            Ack:Cmessage.condition.FALSE
          });
        }
    }); //End Suggestion Data
  }else{
    res.status(200).json({
      message:Cmessage.checksuggestion.REQUIRED_FIELDS,
      Ack:Cmessage.condition.FALSE
    });
  }
};

exports.suggestionsentlist = function(req,res){
  var id = (req.body.suggestion_id) ? req.body.suggestion_id : '';
  if(id && id != "")
  {
    SuggestionMap
      .find({suggestionId:id})
      .populate('suggestionId')
      .populate('postedTo')
      .exec(function(err,suggestionMapData){
        if(err){
          return res.sendStatus(400);
        }

        if(suggestionMapData && suggestionMapData.length > 0)
        {
          var suggestionSentList = [];
          suggestionMapData.forEach(function(smd){
            suggestionSentList.push({
              toSuggestThat:smd.suggestionId.toSuggestthat.toString(),
              UserName:smd.postedTo.userName,
              Email:smd.postedTo.email,
              UserId:smd.postedTo._id.toString()
            });
          });

          res.status(200).json({
            toSuggestThat:suggestionMapData[0].suggestionId.toSuggestthat.toString(),
            SendUserList:suggestionSentList,
            TotalUserCount:suggestionMapData.length,
            message:'User found.',
            AlertAck:'true'
          }); 
    
        }else{
          var suggestionSentList = [];
          Suggestion.findOne({_id:id},function(err,suggData){

            if(err){
              return res.sendStatus(400);
            }
            if(suggData && suggData.toSuggestthat && suggData.toSuggestthat == 1){
              res.status(200).json({
                toSuggestThat:suggData.toSuggestthat.toString(),
                SendUserList:suggestionSentList,
                TotalUserCount:0,
                message:'User found.',
                AlertAck:'true'
              });
            }else{
              res.status(200).json({
                message:'No User found.',
                AlertAck:'true'
              }); 
            }
          });
        }
      });         
  }else{
    res.status(200).json({
      message:'Please enter valid parameter.',
      AlertAck:'false'
    }); 
  }
};

exports.suggestionimage = function(req,res){

  Suggestion.find({},{awsMinithumbUrl:1,awsThumbnailUrl:1})
          .limit(5)
          .exec(function(err,suggData){
            if(err){
              return res.sendStatus(400);
            }

            res.status(200).json({
              data:suggData,
              AlertAck:'false'
            }); 

  });

};


exports.getsuggestion = function(req,res){

  var suggestion_id = (req.body.suggestion_id)?req.body.suggestion_id:'';

  if(suggestion_id != ''){
    //Get Suggestion
    Suggestion.findOne({_id:suggestion_id},function(err,suggData){
        if(err){
          return res.sendStatus(400);
        }
        if(suggData){
          res.status(200).json({
            data:suggData,
            exists_flag:1,
            Ack:Cmessage.condition.TRUE
          });
        }else{
          res.status(200).json({
            message:Cmessage.checksuggestion.SUGGESTION_NOT_EXISTS,
            exists_flag:0,
            Ack:Cmessage.condition.FALSE
          });
        }
    }); //End Suggestion Data
  }else{
    res.status(200).json({
      message:Cmessage.checksuggestion.REQUIRED_FIELDS,
      Ack:Cmessage.condition.FALSE
    });
  }

};