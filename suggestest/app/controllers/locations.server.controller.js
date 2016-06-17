'use strict';
var Suggestion    = require('../models/suggestion.server.model'),
    SuggestionMap = require('../models/suggestionmap.server.model'),
    SuggestionReport = require('../models/suggestionreport.server.model'),
    SuggestionLike    = require('../models/suggestionlike.server.model'),
    SuggestionComment = require('../models/suggestioncomment.server.model'),
    SuggestionView    = require('../models/suggestionview.server.model'),
    Request       = require('../models/request.server.model'),
	  config        = require('../../config/config'),
    moment        = require('moment-timezone'),
	  GooglePlaces  = require('node-googleplaces'),
    general       = require('../helpers/general'),
    http          = require("https"),
    async         = require('async'),
	  Cmessage      = require('../helpers/common');  // added common.js file

//48th Api getlocation
exports.getLocation = function(req,res){

	var user_id = (req.body.user_id)?req.body.user_id:'';
	var lat = (req.body.lat)?req.body.lat:'';
	var long = (req.body.long)?req.body.long:'';
	var type = (req.body.type)?req.body.type:'';
	var keyword = (req.body.keyword)?req.body.keyword:'';
	var key = config.google.google_api_key;  
	var rankby = 'distance';
	var unit = (req.body.distance_measurement_unit)?req.body.distance_measurement_unit:'M';
 //Unit should be e.g. M = Miles, K = Kilometers, N = Nautical Miles 
 if(unit == "M" || unit == "K" || unit == "N")
 {
    var unit = unit;
 }else{
   res.status(200).json({
     message:Cmessage.getlocation.UNIT_MEASURE_SHOULD,
     FindLocationAck:Cmessage.condition.FALSE
   });
 }

 //Google api page token for Pagination
 var page_token = (req.body.page_token)?req.body.page_token:'';

 if(user_id != "" && lat != "" && long != "")
 {

    /*
    var lat_lang = [lat,long];

    
    //var host = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location='+lat_lang.toString()+'&key='+key;
    var host = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location='+lat_lang.toString();

    host+='&radius=50000';

    if(type!=''){
      host+='&types='+type;
    }
    if(page_token!=''){
      host+='&pagetoken='+page_token;
    }
    if(keyword!=''){
      host+='&keyword='+keyword;
    }

    host+='&key='+key;
    */

    var rankby = 'distance';

    var url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location="+lat+","+long+"&key="+key+"&rankby="+rankby;

    if(type!=''){
      url+='&types='+type;
    }
    if(page_token!=''){
      url+='&pagetoken='+page_token;
    }
    if(keyword!=''){
      url+='&keyword='+keyword;
    }

   
    http.get(url, function(res_locations){
      
           var body ='';      
           //console.log('Response is '+res.statusCode);

           res_locations.on('data', function (chunk) {
                  body += chunk;
            });

           res_locations.on('end', function () {
              var places = JSON.parse(body);
              
              var next_page_token = '';
              if(places.next_page_token)
              {                
                next_page_token = places.next_page_token;
              }
              var locations = places.results;
              var status = places.status;
              if(locations && locations!='' && status == 'OK'){
                var arrLocationInfo = [];           
              async.eachSeries(locations,function(value,asyncCallback){
                
                  if(value.icon && value.icon!=''){
                    var icon = value.icon;
                  }else{
                    var icon = '';
                  }
                  if(value.place_id && value.place_id != ''){
                    var placeId = value.place_id; 
                  }else{
                    var placeId = '';
                  }
                  if(value.name && value.name != ''){
                    var name = value.name; 
                  }else{
                    var name = '';
                  }
                  if(value.vicinity && value.vicinity != ''){
                    var vicinity = value.vicinity; 
                  }else{
                    var vicinity = '';
                  }
                  if(value.geometry.location.lat && value.geometry.location.lat != ''){
                    var lat2 = value.geometry.location.lat; 
                  }else{
                    var lat2 = '';
                  }
                  if(value.geometry.location.lng && value.geometry.location.lng != ''){
                    var long2 = value.geometry.location.lng; 
                  }else{
                    var long2 = '';
                  }
                  if(lat2!='' && long2!='' && lat!=''  && long!='' && unit!=''){
                    var distance = '';
                    general.getDistance(lat,long,lat2,long2,unit,function(dist){
                        distance = dist;
                    });
                  }else{
                    var distance = '';
                  }
                    if(value.photos && value.photos!=''){
                      if(value.photos[0].photo_reference!='' && value.photos[0].photo_reference){
                        var photoReference = value.photos[0].photo_reference;
                      }else{
                        var photoReference = '';
                      }
                    }else{
                      var photoReference = '';
                    }
                    


                   Suggestion.find({$and:[
                        {suggestionType:'Normal'},
                        {googleLocationId:placeId},
                        {$or:[
                            {postedBy:user_id},
                            {toSuggestthat:"1"}
                        ]}
                      ]})
                    .populate('postedBy')
                    .exec(function(err,suggestionData){
                      if(err){
                        console.log(err);
                      }
                      var data = [];
                        async.each(suggestionData,function(suggestion,callback){
                          SuggestionMap.find({$and:[
                                  {postedTo:user_id},
                                  {suggestionId:suggestion._id}
                              ]}).populate('suggestionId').exec(function(err,suggestionMapData){
                                if(err){
                                  console.log(err);
                                }
                          Request.find({requestToId:suggestion.postedBy._id}).populate('requestToId').exec(function(err,requestData){
                              if(err){
                                console.log(err);
                              }
                            if(suggestion || suggestionMapData || requestData){ 
                                data.push({
                                    'suggestionId':suggestion._id,
                                    'title':suggestion.title,
                                    'UserId':suggestion.postedBy._id,
                                    'UserName':suggestion.postedBy.userName
                                });
                                callback();
                            }
                          }); //End Of Request Data
                        });  //End Of Suggestion Map Data    
                        },function(err){
                           
                          if(data.length > 0){
                            var suggestion_avail_flag = 1;
                            var total_suggestion = data.length;
                          }else{
                            var suggestion_avail_flag = 0;
                            var total_suggestion = 0;
                          }

                          var distance_miles = distance.split(" ");

                          arrLocationInfo.push({
                                          'icon':icon,
                                          'name':name,
                                          'vicinity':vicinity,
                                          'lat':lat2,
                                          'lng':long2,
                                          'PlaceId':placeId,
                                          'suggestion_avail_flag':suggestion_avail_flag,
                                          'totalsuggestion':total_suggestion,
                                          'distance':distance,
                                          'photo_reference':photoReference,
                                          'miles':distance_miles[0]
                          });
                       }); //End Of For Loop
                    }); //End Of Suggestion Data
                                           
                            asyncCallback(); 
                       
                         
                  
                                                  
                },function(err){
                      if(!err){


                        arrLocationInfo = arrLocationInfo.sort(function(a, b) {
                          var sortResult = a.miles - b.miles;                      
                          return sortResult;
                        });

                        res.status(200).json({
                          NextPageToken:next_page_token,
                          FindLocationInfo:arrLocationInfo,
                          message:Cmessage.getlocation.NEARBY_LOCATION,
                          status:places.status,
                          FindLocationAck:Cmessage.condition.TRUE
                        }); 
                      }else{
                        var  error_message = places.error_message;
                        res.status(200).json({
                          ErrorMessage:error_message,
                          message:Cmessage.getlocation.NEARBY_LOCATION_NOT_FOUND,
                          status:places.status,
                          FindLocationAck:Cmessage.condition.FALSE
                        });
                      }
                }); //End loop for location
              }else{
				var  error_message = places.error_message;
				 res.status(200).json({
				   ErrorMessage:error_message,
				   message:Cmessage.getlocation.NEARBY_LOCATION_NOT_FOUND,
				   status:places.status,
				   FindLocationAck:Cmessage.condition.FALSE
				 });
			  } 
              //var randLoc = locations[Math.floor(Math.random() * locations.length)]
             
           });
    }).on('error', function(e) {
        var  error_message = places.error_message;
        res.status(200).json({
          ErrorMessage:error_message,
          message:Cmessage.getlocation.NEARBY_LOCATION_NOT_FOUND,
          status:places.status,
          FindLocationAck:Cmessage.condition.FALSE
        });
    });

 }else{
    if(user_id == ''){
      res.status(200).json({
        message:Cmessage.getlocation.USER_NOT_LOGIN,
        FindLocationAck:Cmessage.condition.FALSE
      });
    }else{
      res.status(200).json({
        message:Cmessage.getlocation.REQUIRED_FIELDS,
        FindLocationAck:Cmessage.condition.FALSE
      });
    }
 }
};

 //49th Api Location detail with suggestion list
exports.getlocationDetail = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id:'';
  var location_id = (req.body.location_id)?req.body.location_id:'';
  var key = config.google.google_api_key;  
  var timezone = req.body.timezone?req.body.timezone.trim():'+00:00';
  if(user_id!=='' && location_id!==''){
      var place_id = location_id;
      var host = 'https://maps.googleapis.com/maps/api/place/details/json?placeid='+location_id+'&key='+key;
        http.get(host, function(res_locations){
          var body ='';      

           res_locations.on('data', function (chunk) {
                  body += chunk;
            });

           res_locations.on('end', function () {
                var places = JSON.parse(body);
                //console.log(places);
                if(places.result && places.result!== '' && places.status =='OK'){
                    var results =  places.result;
                    if(results.name && results.name!==''){
                      var name = results.name;
                    }else{
                      var name = '';
                    }
                    if(results.place_id && results.place_id != ''){
                      var locationId = results.place_id; 
                    }else{
                      var locationId = '';
                    }
                    if(results.formatted_phone_number && results.formatted_phone_number != ''){
                      var formatted_phone_number = results.formatted_phone_number; 
                    }else{
                      var formatted_phone_number = '';
                    }
                    if(results.formatted_address && results.formatted_address != ''){
                      var address = results.formatted_address; 
                    }else{
                      var address = '';
                    }
                    if(results.international_phone_number && results.international_phone_number != ''){
                      var contact_no = results.international_phone_number; 
                    }else{
                      var contact_no = '';
                    }
                    if(results.url && results.url != ''){
                      var url = results.url; 
                    }else{
                      var url = '';
                    }
                    if(results.geometry.location.lat && results.geometry.location.lat != ''){
                      var lat = results.geometry.location.lat; 
                    }else{
                      var lat = '';
                    }
                    if(results.geometry.location.lng && results.geometry.location.lng != ''){
                      var long = results.geometry.location.lng; 
                    }else{
                      var long = '';
                    }
                    if(results.international_phone_number && results.international_phone_number != ''){
                      var contact_no = results.international_phone_number; 
                    }else{
                      var contact_no = '';
                    }

                    if(results.price_level && results.price_level != ''){
                      var price_level = results.price_level; 
                    }else{
                      var price_level = '';
                    }

                    

                   
                    
                      if(results.opening_hours!= '' && results.opening_hours!=undefined){
                        if( results.opening_hours.open_now!='' && results.opening_hours.open_now){
                          var open_now = results.opening_hours.open_now;
                        }else{
                          var open_now = '';
                        }
                      }else{
                        var open_now = '';
                      }

                      if(results.opening_hours!= '' && results.opening_hours!=undefined) 
                        if(results.opening_hours.weekday_text!='' && results.opening_hours.weekday_text){
                          var weekday_text = results.opening_hours.weekday_text;
                        }else{
                          var weekday_text = '';
                        }
                      else{
                        var weekday_text = '';
                      }

                         
                    if(results.rating && results.rating!==''){
                      var rating = results.rating;
                    }else{
                      var rating = '';
                    }
                    if(results.website && results.website!==''){
                      var website = results.website;
                    }else{
                      var website = '';
                    }
                    if(results.photos!='' && results.photos){
                      if(results.photos[0].photo_reference!='' && results.photos[0].photo_reference){
                        var photo_reference = results.photos[0].photo_reference;
                      }else{
                        var photo_reference = '';
                      }
                    }else{
                      var photo_reference = '';
                    }

                    var arrLocationInfo = {
                      'name':name,
                      'location_id':locationId,
                      'address':address,
                      'international_phone_number':contact_no,
                      'formatted_phone_number':formatted_phone_number,
                      'lat':lat,
                      'long':long,
                      'url':url,
                      'open_now':open_now,
                      'weekday_text':weekday_text,
                      'rating':rating,
                      'website':website,
                      'photo_reference':photo_reference,
                      'price_level':price_level
                    } 

                    res.status(200).json({
                      GoogleLocationInfo:arrLocationInfo,
                      message:Cmessage.getlocationdetail.LOCATION_DETAIL,
                      status:places.status,
                      LocationDetailAck:Cmessage.condition.TRUE
                    }); 

                  }else{
                    var arrResultDetails = [];
                    var error_message = places.error_message;
                    if(error_message && error_message!==''){
                      res.status(200).json({
                        ErrorMessage:error_message,
                        message:Cmessage.getlocationdetail.LOCATION_DETAIL_NOT_FOUND,
                        status:places.status,
                        LocationDetailAck:Cmessage.condition.FALSE
                      });
                    }
                      res.status(200).json({
                        message:Cmessage.getlocationdetail.LOCATION_DETAIL_NOT_FOUND,
                        status:places.status,
                        LocationDetailAck:Cmessage.condition.FALSE
                      });
                }
           });
        }).on('error', function(e) {
          console.log('ERROR');
          console.log("Got error: " + e.message);
        });

  }else{
    if(user_id == ''){
      res.status(200).json({
        message:Cmessage.getlocationdetail.USER_NOT_LOGIN,
        LocationDetailAck:Cmessage.condition.FALSE
      });
    }else{
      res.status(200).json({
        message:Cmessage.getlocationdetail.REQUIRED_FIELDS,
        LocationDetailAck:Cmessage.condition.FALSE
      });
    } 
  }
};

exports.googlelLocationList = function(req,res){
      var user_id  = (req.body.user_id)?req.body.user_id: '';
      var location_id  = (req.body.location_id)?req.body.location_id : '';
      var timezone = (req.body.timezone)?req.body.timezone:'+00:00';
      var start = (req.body.start)?req.body.start:0;
      var count = (req.body.count)?req.body.count:10;
      if(user_id!='' && location_id!=''){
          //console.log(location_id);
          //Get Suggestion Data
          Suggestion.find({$and:[
                  {suggestionType:'Normal'},
                  {googleLocationId:location_id},
                {$or:[
                  {toSuggestthat:1},
                  {postedBy:user_id}
                ]}]}).populate('postedBy').populate('type').populate('category')
            .sort({createdAt:1})
            .skip(start).limit(count).exec(function(err,suggestions){

              if(err){
                console.log(err);
              }
              
              var suggestionData = [];
              async.each(suggestions,function(suggestion,asyncCallback){
                  SuggestionMap.find({$and:[{suggestionId:suggestion._id},{postedTo:user_id}]},function(err,suggestionmapData){
                    if(err){
                      return asyncCallback(err); 
                    }
                    SuggestionReport.find({$and:[{suggestionId:suggestion._id},{reportedId:user_id}]},function(err,suggestionreportData){
                        if(err){
                          return asyncCallback(err); 
                        }
                      Request.find({requestToId:suggestion.postedBy._id},function(err,requestData){
                        if(err){
                          return asyncCallback(err); 
                        }
                        if(suggestion || suggestionmapData || suggestionreportData || requestData){
                          // Start suggviewCount
                          SuggestionView.find({suggestionId:suggestion._id}).count().exec(function(err,suggviewCount){
                            if(err){
                              return asyncCallback(err); 
                            }
                            // Start Suggestion View User Count
                            SuggestionView.find({$and:[
                                  {suggestionId:suggestion._id},
                                  {userId:user_id}
                                ]}).count().exec(function(err,suggviewuserCount){
                              if(err){                     
                                return asyncCallback(err); 
                              }  
                            // Start sugglikeCount
                          SuggestionLike.find({suggestionId:suggestion._id}).count().exec(function(err,sugglikeCount){
                            if(err){
                              return asyncCallback(err); 
                            }
                            // Start Suggestion Like User Count
                            SuggestionLike.find({$and:[
                                  {suggestionId:suggestion._id},
                                  {userId:user_id}
                                ]}).count().exec(function(err,sugglikeuserCount){
                              if(err){                     
                                return asyncCallback(err); 
                              }
                              // Start Suggestion Comment Count
                              SuggestionComment.find({suggestionId:suggestion._id}).count().exec(function(err,suggcommentCount){
                                if(err){                    
                                  return asyncCallback(err);  
                                }

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
                                  var reported = (suggestionreportData.reportFlag)?1:0;
                                  var product_url = (suggestion.product_url)?suggestion.product_url:'';
                                  var Photo = (suggestion.postedBy.photo)?suggestion.postedBy.photo:'';
                                  var created_at = moment(suggestion.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD');

                                  suggestionData.push({
                                      suggestionId:suggestion._id.toString(),
                                      title:suggestion.title,
                                      caption:suggestion.caption,
                                      file:aws_file_url,
                                      fileshare:aws_file_url,
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
                                      count_comments:count_comments.toString()                  
                                  });
                                        
                                      asyncCallback();
                              }); //end Of Suggestion comment Data
                            
                            }); //end Of Suggestion Like for USer Data
                          
                          }); //end Of Suggestion Like Data
                          
                          }); //end Of Suggestion View for USer Data
                          
                          }); //end Of Suggestion View Data

                        }
                      }); //end Request Data

                    }); //end Of Suggestion report Data

                  }); //End Of suggestion Map Data

              },function(err){
                  //console.log(suggestionData);
                  if(suggestionData && suggestionData.length > 0){
                    var suggestion_list = [];
                    suggestion_list = suggestionData;
                   
                    var location_like_count = 0;
                    suggestion_list.forEach(function(suggestion){
                      if(suggestion.count_likes != 0){
                        location_like_count = location_like_count + suggestion.count_likes;
                        console.log(location_like_count);
                      }
                    });
                     console.log('Outside Loop'+location_like_count);
                    res.status(200).json({
                      RelatedSuggestion:suggestion_list,
                      Totalrecord:suggestionData.length,
                      location_like_count:location_like_count,
                      message:Cmessage.googlelocationlist.LOCATION_SUGGESTION_FOUND,
                      LocationSuggestionAck:Cmessage.condition.TRUE
                    });
                  }else{
                    res.status(200).json({
                      message:Cmessage.googlelocationlist.LOCATION_SUGGESTION_NOT_FOUND,
                      LocationSuggestionAck:Cmessage.condition.FALSE
                    });
                  }
              }); //End Of Async loop
          }); //End Of Suggestion Data
      }else{
          if(user_id == ''){
            res.status(200).json({
              message:Cmessage.googlelocationlist.USER_NOT_LOGIN,
              FindLocationAck:Cmessage.condition.FALSE
            });
          }else{
            res.status(200).json({
              message:Cmessage.googlelocationlist.REQUIRED_FIELDS,
              FindLocationAck:Cmessage.condition.FALSE
            });
          }
      } 
};