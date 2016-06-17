'use strict';

var User  = require('../models/user.server.model'),
    Group = require('../models/group.server.model'),
    GroupMember = require('../models/groupmember.server.model'),
    Suggestion    = require('../models/suggestion.server.model'),
    SuggestionMap    = require('../models/suggestionmap.server.model'),
    moment = require('moment-timezone'),
    config     = require('../../config/config'),
    apn        = require('apn'),
    utf8       = require('utf8'),
    gcm = require('android-gcm'),
    Cmessage   = require('../helpers/common');

exports.getUserName = function(user_id,cb){
  User.findOne({_id:user_id},function(err,userNameData){
    if(err){
      console.log(err);
    }
    if(userNameData){
      var UserName = userNameData.userName;
      cb(UserName);
    }
  });
};

exports.getUserDeviceToken = function(user_id,cb){
  User.findOne({_id:user_id},function(err,userDeviceToken){
    if(err){
      console.log(err);
    }
    if(userDeviceToken){
      var token = userDeviceToken.token;
      cb(token);
    }
  });
};

exports.getDeviceType = function(user_id,cb){
   User.findOne({_id:user_id},function(err,userDeviceToken){
    if(err){
      console.log(err);
    }
    if(userDeviceToken){
      var device_type = userDeviceToken.deviceType;
      cb(device_type);
    }
  });
};  

exports.getGroupName = function(group_id,cb){
  Group.findOne({_id:group_id},function(err,groupNameData){
    if(err){
      console.log(err);
    }
    if(groupNameData){
      var group_name = groupNameData.groupName;
      cb(group_name);
    }
  });
};

exports.checkUserValid = function(user_id,cb){
  User.findOne({_id:user_id}).count().exec(function(err,userCount){
    if(err){
      console.log(err);
    }
    var UserCnt = userCount;
    cb(UserCnt);
  });
};

exports.SuggestionPush = function(suggestion_id,type){
  if(suggestion_id && suggestion_id!==''){
    Suggestion.findOne({_id:suggestion_id})
      .populate('postedBy')
      .exec(function(err,suggestion){
        if(err){
          console.log(err);
        }
        console.log("STEP:1");
        var username = suggestion.postedBy.userName;
        var user_id = suggestion.postedBy._id;
        var device_type = suggestion.postedBy.deviceType;
        
        if(user_id!==''){
          console.log("STEP:2");
          SuggestionMap.find({suggestionId:suggestion_id})
              .populate('postedTo')
              .exec(function(err,suggestionsMapData){
              if(err){
                return res.sendStatus(400);
              }
              console.log("STEP:3");
            if(suggestionsMapData){
              console.log("STEP:4");
              console.log(suggestionsMapData);
              suggestionsMapData.forEach(function(SuggestionMapData){
                if(SuggestionMapData.postedTo.token!==''){
                  var token = SuggestionMapData.postedTo.token;
                  var device_type = SuggestionMapData.postedTo.deviceType; 
                  if(token && token!==''){
                    if(device_type == 'IPHONE'){
                        if(type == 'Normal'){
                          var message = 'New suggestion from '+username;
                        }else{
                          var message = 'New '+type+' suggestion from '+username;
                        }

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

                        var myDevice = new apn.Device(token);

                        var note = new apn.Notification();
                        
                        if(type == 'Instant') {
                          var payload = {
                            isFriendRequest : "false",
                            isNormalSuggestion : "false",                       
                            type : 0
                          };                      
                        }
                        if(type == 'Normal') {
                          var payload = {
                            isFriendRequest : "false",
                            isNormalSuggestion : "true",                            
                            suggestionid:suggestion_id.toString(),
                            type : 0
                          };
                        }

                        //note.badge = 3;
                        note.sound = "default";
                        note.alert =  message;
                        note.payload = payload;
                        
                        apnConnection.pushNotification(note, myDevice);
                        console.log(note);
                        
                    }else{
                       if(type == 'Instant'){
                            var gcm = require('android-gcm');
                            var regTokens = [];
                            regTokens.push(token);
                            console.log('Registered Tokens'+regTokens);
                            // initialize new androidGcm object 
                            var gcmObject = new gcm.AndroidGcm('AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc');
                             
                            // create new message 
                            var message = new gcm.Message({
                                registration_ids: regTokens,
                                data: {
                                  "message" : {'postedby':user_id,'message':'New '+type+' suggestion from '+username,'isFriendRequest':'false','type':0,'isNormalSuggestion':'false'}
                                }
                            });
                            

                            gcmObject.send(message, function(err, response) {
                              if(err) console.error(err);
                                else    console.log(response);
                            });
                       }
                       if(type == 'Normal'){
                          var gcm = require('android-gcm');
                            var regTokens = [];
                            regTokens.push(token);
                            console.log('Registered Tokens'+regTokens);
                            // initialize new androidGcm object 
                            var gcmObject = new gcm.AndroidGcm('AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc');
                             
                            // create new message 
                            var message = new gcm.Message({
                                registration_ids: regTokens,
                                data: {
                                  "message" : {'postedby':user_id,'message':'New suggestion from  '+username,'isFriendRequest':'false','type':0,'suggestionid':suggestion_id,'isNormalSuggestion':'true'}
                                }
                            });

                            gcmObject.send(message, function(err, response) {
                              if(err) console.error(err);
                                else    console.log(response);
                            });
                       }        
                    }
                  }
                }
              }); //End Foreach Loop
            }
             
          }); //End Suggestion Map Data
        }
    
    }); //End Suggestion Data
  }

};

exports.sendPushNotificationGeneral = function(){

};

exports.sendPushnotification = function(type,token,message,postedby,suggestionid,cb){
   var regTokens = [];
    regTokens.push(token);

    // initialize new androidGcm object 
    var gcmObject = new gcm.AndroidGcm('AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc');
  
      // create new message 
    if(type == 'Instant'){
      var message = new gcm.Message({
          registration_ids: regTokens,
          data: {
            "message" : {"postedby":postedby,"message":message,"isFriendRequest":"false","isNormalSuggestion":"false","type":0}
          }
      });
    }
    if(type == 'Normal'){
      var message = new gcm.Message({
          registration_ids: regTokens,
          data: {
            "message" : {"postedby":postedby,"message":message,"isFriendRequest":"false","isNormalSuggestion":"true","suggestionid":suggestionid,"type":0}
          }
      });
    }

    gcmObject.send(message, function(err, response) {
      if(err) console.error(err);
        else    console.log(response);
         cb(response);
    });
};

exports.getGroupMemberList = function(user_id,group_id,timezone,cb){
  if(user_id!== '' && group_id!== ''){
    //Get Group Data 
    Group.findOne({_id:group_id})
        .populate('createdBy')
        .exec(function(err,groupData){
          if(err){
             console.log(err);
          }
          if(groupData){
          GroupMember.find({
              $and:[{groupId:groupData._id},{status:"1"}]
            },function(err,groupMemberData){
              if(err){
                 console.log(err);
              }            
          if(groupMemberData){ //Group Member Data
               var memberId = [];
                groupMemberData.forEach(function(groupMember){
                  if(groupMember.fromUserId)
                  {
                    memberId.push(groupMember.fromUserId);  
                  }
                  if(groupMember.toUserId)
                  {
                    memberId.push(groupMember.toUserId);  
                  }                                 
                });
                 var members = memberId.join(',');
                
                if(groupData.awsImageUrl != ''){
                    var aws_image_url = groupData.awsImageUrl;
                }else{
                  var aws_image_url = groupData.groupImage
                }
                  var created_at = moment(groupData.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD HH:mm:ss');
                  var group_image = aws_image_url;
                  //Main Fields
                  var group_name = groupData.groupName;
                  var group_owner = groupData.createdBy.userName;
                  var group_create_time = created_at;
                  var group_owner_user_id =groupData.createdBy._id;

                  if(members && members!==''){
                    var data = members.split(',');
                  }else{
                    var data = group_owner_user_id;
                  }
                 

                  //Get User Data
                User.find({_id:{$in:data}}).exec(function(err,userData){
                  if(err){
                    console.log(err);
                  }
                    var users = [];
                    for(var i=0;i<userData.length;i++){
                      var photo =(userData[i].photo)?config.baseUrl.url+'public/uploads/files/user/'+userData[i].photo:config.baseUrl.url+'public/uploads/files/user/nouser.jpg'
                      var token = userData[i].token;
                      var username = userData[i].userName;
                      var device_type =userData[i].deviceType;
                      var userId = userData[i]._id;
                      //console.log('Photo'+photo+ 'token'+token+'username'+username+'device_type'+device_type);
                      users.push({
                          'Photo':photo,
                          'token':token,
                          'UserName':username,
                          'device_type':device_type,
                          'UserId':userId
                      });
                    } 
                    if(users){
                      var groupmembers = {
                        'GroupName':group_name,
                        'GroupImage':group_image,
                        'GroupOwner':group_owner,
                        'GroupCreateTime':group_create_time,
                        'GroupMemberList':users,
                        'message':Cmessage.groupmemberlist.GROUP_MEMBER_LIST,
                        'GroupMemberListAck':Cmessage.condition.TRUE
                      };
                      cb(groupmembers);
                    }
                      
                   
 
                }); //End User Data


          }
        }); //end Group Member Data
      }
    });
  }else{
      var result = {'message':Cmessage.groupmemberlist.USER_NOT_LOGIN,
                    'GroupMemberListAck':Cmessage.condition.FALSE
                  };
      cb(result);
  }
};

exports.getDistance = function(lat1,lon1,lat2,lon2,unit,cb){
  var theta = lon1-lon2;
  var dist = Math.sin(lat1 * (Math.PI/180)) * Math.sin(lat2 * (Math.PI/180)) +  Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.cos(theta * (Math.PI/180));
  dist = Math.acos(dist);
  dist = (dist * (180/Math.PI));
  var miles = dist * 60 * 1.1515;
  var unit = unit.toUpperCase();
   if (unit == "K") {
        var distance = (miles * 1.609344).toFixed(2)+" KM";
        cb(distance);
    }
    else if (unit == "N") 
    {
         var distance =  (miles * 0.8684).toFixed(2);
          cb(distance);
    }
    else
    {
        var distance = miles.toFixed(2)+" Miles";
        cb(distance);
    }

};

exports.getCountryCallingCode = function(country){

  var code = {
                'AF' : '+93',
                'AX' : '+35818',
                'NL' : '+31',
                'AN' : '+599',
                'AL' : '+355',
                'DZ' : '+213',
                'AS' : '+685',
                'AD' : '+376',
                'AO' : '+244',
                'AI' : '+1264',
                'AQ' : '+672',
                'AG' : '+1268',
                'AE' : '+971',
                'AR' : '+54',
                'AM' : '+374',
                'AW' : '+297',
                'AU' : '+61',
                'AZ' : '+994',
                'BS' : '+1242',
                'BH' : '+973',
                'BD' : '+880',
                'BB' : '+1242',
                'BE' : '+32',
                'BZ' : '+501',
                'BJ' : '+229',
                'BM' : '+1441',
                'BT' : '+975',
                'BO' : '+591',
                'BA' : '+387',
                'BW' : '+267',
                'BV' : '+47',
                'BR' : '+55',
                'GB' : '+44',
                'IO' : '+246',
                'VG' : '+1284',
                'BN' : '+673',
                'BG' : '+359',
                'BF' : '+226',
                'BI' : '+257',
                'KY' : '+1345',
                'CL' : '+56',
                'CK' : '+682',
                'CR' : '+506',
                'DJ' : '+253',
                'DM' : '+1767',
                'DO' : '+1809',
                'EC' : '+593',
                'EG' : '+20',
                'SV' : '+503',
                'ER' : '+291',
                'ES' : '+34',
                'ZA' : '+27',
                'GS' : '+500',
                'KR' : '+82',
                'ET' : '+251',
                'FK' : '+500',
                'FJ' : '+679',
                'PH' : '+63',
                'FO' : '+298',
                'GA' : '+241',
                'GM' : '+220',
                'GE' : '+995',
                'GH' : '+233',
                'GI' : '+350',
                'GD' : '+1473',
                'GL' : '+299',
                'GP' : '+590',
                'GU' : '+1671',
                'GT' : '+502',
                'GG' : '+44',
                'GN' : '+224',
                'GW' : '+245',
                'GY' : '+592',
                'HT' : '+509',
                'HM' : '+61',
                'HN' : '+504',
                'HK' : '+852',
                'SJ' : '+47',
                'ID' : '+62',
                'IN' : '+91',
                'IQ' : '+964',
                'IR' : '+98',
                'IE' : '+353',
                'IS' : '+354',
                'IL' : '+972',
                'IT' : '+39',
                'TL' : '+670',
                'AT' : '+43',
                'JM' : '+1876',
                'JP' : '+81',
                'YE' : '+967',
                'JE' : '+44',
                'JO' : '+962',
                'CX' : '+61',
                'KH' : '+855',
                'CM' : '+237',
                'CA' : '+1',
                'CV' : '+238',
                'KZ' : '+7',
                'KE' : '+254',
                'CF' : '+236',
                'CN' : '+86',
                'KG' : '+996',
                'KI' : '+686',
                'CO' : '+57',
                'KM' : '+269',
                'CG' : '+242',
                'CD' : '+243',
                'CC' : '+61',
                'GR' : '+30',
                'HR' : '+385',
                'CU' : '+53',
                'KW' : '+965',
                'CY' : '+357',
                'LA' : '+856',
                'LV' : '+371',
                'LS' : '+266',
                'LB' : '+961',
                'LR' : '+231',
                'LY' : '+218',
                'LI' : '+423',
                'LT' : '+370',
                'LU' : '+352',
                'EH' : '+21228',
                'MO' : '+853',
                'MG' : '+261',
                'MK' : '+389',
                'MW' : '+265',
                'MV' : '+960',
                'MY' : '+60',
                'ML' : '+223',
                'MT' : '+356',
                'IM' : '+44',
                'MA' : '+212',
                'MH' : '+692',
                'MQ' : '+596',
                'MR' : '+222',
                'MU' : '+230',
                'YT' : '+262',
                'MX' : '+52',
                'FM' : '+691',
                'MD' : '+373',
                'MC' : '+377',
                'MN' : '+976',
                'ME' : '+382',
                'MS' : '+1664',
                'MZ' : '+258',
                'MM' : '+95',
                'NA' : '+264',
                'NR' : '+674',
                'NP' : '+977',
                'NI' : '+505',
                'NE' : '+227',
                'NG' : '+234',
                'NU' : '+683',
                'NF' : '+672',
                'NO' : '+47',
                'CI' : '+255',
                'OM' : '+968',
                'PK' : '+92',
                'PW' : '+680',
                'PS' : '+970',
                'PA' : '+507',
                'PG' : '+675',
                'PY' : '+595',
                'PE' : '+51',
                'PN' : '+870',
                'KP' : '+850',
                'MP' : '+1670',
                'PT' : '+351',
                'PR' : '+1',
                'PL' : '+48',
                'GQ' : '+240',
                'QA' : '+974',
                'FR' : '+33',
                'GF' : '+594',
                'PF' : '+689',
                'TF' : '+33',
                'RO' : '+40',
                'RW' : '+250',
                'SE' : '+46',
                'RE' : '+262',
                'SH' : '+290',
                'KN' : '+1869',
                'LC' : '+1758',
                'VC' : '+1784',
                'BL' : '+590',
                'MF' : '+1599',
                'PM' : '+508',
                'DE' : '+49',
                'SB' : '+677',
                'ZM' : '+260',
                'WS' : '+685',
                'SM' : '+378',
                'SA' : '+966',
                'SN' : '+221',
                'RS' : '+381',
                'SC' : '+248',
                'SL' : '+232',
                'SG' : '+65',
                'SK' : '+421',
                'SI' : '+386',
                'SO' : '+252',
                'LK' : '+94',
                'SD' : '+249',
                'FI' : '+358',
                'SR' : '+594',
                'CH' : '+41',
                'SZ' : '+268',
                'SY' : '+963',
                'ST' : '+239',
                'TJ' : '+992',
                'TW' : '+886',
                'TZ' : '+255',
                'DK' : '+45',
                'TH' : '+66',
                'TG' : '+228',
                'TK' : '+690',
                'TO' : '+676',
                'TT' : '+1868',
                'TN' : '+216',
                'TR' : '+90',
                'TM' : '+993',
                'TC' : '+1649',
                'TV' : '+688',
                'TD' : '+235',
                'CZ' : '+420',
                'UG' : '+256',
                'UA' : '+380',
                'HU' : '+36',
                'UY' : '+598',
                'NC' : '+687',
                'NZ' : '+64',
                'UZ' : '+998',
                'BY' : '+375',
                'VU' : '+678',
                'VA' : '+39',
                'VE' : '+58',
                'RU' : '+7',
                'VN' : '+84',
                'EE' : '+372',
                'WF' : '+681',
                'US' : '+1',
                'VI' : '+1340',
                'UM' : '+1',
                'ZW' : '+263'
  };

  if(country && country != '')
  {
    return code[country];
  }

  return code;
    
};

exports.randomNumber = function(limit){
  //Check UserName Valid or not
  var Password = "";
  // Start Generate Password              
  var possible = "0123456789";
  
  for( var i=0; i < limit; i++ ) {
    Password += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  // End Generate Password
  return utf8.encode(Password);
}

//x1. Twilio SMS send
exports.sendOtpSms = function(to, message){
  //require the Twilio module and create a REST client 
  var client = require('twilio')(config.twilio.accountSID, config.twilio.authToken); 
    console.log("accountSID:"+config.twilio.accountSID);
    console.log("authToken:"+config.twilio.authToken);
    console.log("from:"+config.twilio.from);
  client.messages.create({
    from: config.twilio.from,
      to: to,
      body: message
  }, function(error, message) {
      if (error) {
          console.log("SendOtpSms Error:" + error.message);
      }
  });
};
  
