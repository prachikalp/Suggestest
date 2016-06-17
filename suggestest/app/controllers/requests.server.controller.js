'use strict';

var Request    = require('../models/request.server.model'),
    User       = require('../models/user.server.model'),
    moment     = require('moment'),
    general    = require('../helpers/general'),
    config     = require('../../config/config'),
    async      = require('async'), 
    Cmessage   = require('../helpers/common'),  // added common.js file
    apn        = require('apn'),
    fs        = require('fs'),
    gcm        = require('android-gcm');
//6th Api sendfriendrequest
exports.sendFriendrequest = function(req,res){
  var RequestFrom = req.body.RequestFrom;
  var RequestTo = req.body.RequestTo;
  var Requested_Message = req.body.Message;
  var Status = 'pending';

  //Both Parameters are compulsory
  if(RequestFrom && RequestTo){
    Request.findOne({$and:[
      {
        $or:[
          {
            $and:[
              {requestFromId:RequestFrom},
              {requestToId:RequestTo}
            ]
          },
          {
            $and:[
              {requestFromId:RequestTo},
              {requestToId:RequestFrom}
            ]
          },
        ]
      },
      {
        $or:[
          {status:'pending'},
          {status:'accepted'}
        ]
      }
      ]},function(err,requestData){
        if(err){
          return res.sendStatus(400);
        }
        if(requestData){
          if(requestData.requestToId === RequestTo){
            res.status(200).json({
              message:Cmessage.request.ALREADY_SENT,
              SendRequest:Cmessage.condition.FALSE
            });
          }else{
            res.status(200).json({
              message: Cmessage.request.ALREADY_SENT,
              SendRequest:Cmessage.condition.FALSE
            });
          }
        }else{  //Remove if requestData doesnt exists
          Request.remove({
            $or:[
              {
                $and:[
                  {requestFromId:RequestFrom},
                  {requestToId : RequestTo}
                ],
              },
              {
                $and:[
                  {requestFromId:RequestTo},
                  {requestToId:RequestFrom}
                ]
              }
            ]
          }).exec(function(err,deleteRequest){
             
          });
          
          //Insert the new Request  

            var newRequest = new Request();
            newRequest.requestFromId = RequestFrom;
            newRequest.requestToId = RequestTo;
            newRequest.requestedMessage = Requested_Message;
            newRequest.status = Status;
            newRequest.requestedAt = moment().format('YYYY-MM-DD');
            newRequest.lastAlertViewed = moment().format('0000-00-00 00:00:00');
            newRequest.save();

            /* SEND PUSH NOTIFICATION  */
            User.findOne({_id:RequestTo},function(err,sendRequestTo){
              if(err){
                return res.sendStatus(400);
              }
              if(sendRequestTo){
                if(sendRequestTo.token){
                    var usestoken = sendRequestTo.token;
                    var device_type = sendRequestTo.deviceType;
                    User.findOne({_id:RequestFrom},function(err,sendRequestFrom){
                      if(err){
                        return res.sendStatus(400);
                      }
                      if(sendRequestFrom){
                        //console.log(sendRequestFrom);
                        var fromName = sendRequestFrom.userName;
                        var type ='';
                        var message = fromName+ ' has sent you friend request';
                        var token = usestoken;
                        //Push Notification Code
                        if(device_type === "IPHONE"){
                            console.log(config);
                            var options = {
                              cert: config.apns.certificate,
                              key: config.apns.key,
                              gateway: config.apns.apn_getway,
                              port: config.apns.apn_port
                            };

                            console.log(options);
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
                            
                            var payload = {
                              'isFriendRequest' : 'true',
                              'isNormalSuggestion' : 'false',
                              'type' : 0
                            };

                            note.badge = 3;
                            note.sound = 'default';
                            note.alert =  message;
                            note.payload =  payload;
                            
                            apnConnection.pushNotification(note, myDevice);
                            console.log(note);

                        }else{
                          
                            var regTokens = [];
                            regTokens.push(token);
                            console.log('Registered Tokens'+regTokens);
                            // initialize new androidGcm object 
                            var gcmObject = new gcm.AndroidGcm(config.google.google_api_key);
                             
                            // create new message 
                            var message = new gcm.Message({
                                registration_ids: regTokens,
                                data: {
                                  "message" : {
                                    "message":message,
                                    "isFriendRequest":"true",
                                    "isNormalSuggestion":"false",
                                    "type":0
                                  }
                                }
                            });

                            gcmObject.send(message, function(err, response) {
                              if(err) console.error(err);
                                else    console.log(response);
                            });
                          }
                            //Push Notification Code Left
                          
                      }
                    });
                    
                }
              }
            });
                
              res.status(200).json({
                  message:Cmessage.request.SENT,
                  SendRequest:Cmessage.condition.TRUE
              });
        }
    });
  }else{
    res.status(200).json({
        message:Cmessage.parameters.PROPER_VALUE,
        SendRequest:Cmessage.condition.FALSE
    });
  }   
};

//7th Api managerequest
exports.manageRequest = function(req,res){
  var id = req.body.id;
  var IsApproved = req.body.IsApproved;
  var user_id = req.body.user_id;

  if(id && IsApproved && user_id){
    if(IsApproved === 'accepted' || IsApproved === 'unfriend' || IsApproved === 'denied'){
      if(IsApproved === 'unfriend'){     //If Isapproved is unfriend
        Request.findOne({$and:
          [{
            $or:[
              {$and:[{requestFromId:user_id},{requestToId:id}]},
              {$and:[{requestFromId:id},{requestToId:user_id}]}
            ]
           },
           {status:'accepted'}
          ]},function(err,requestData){
            if(err){
              return res.sendStatus(400);
            }
            if(requestData){
              var status = 'unfriend';
              requestData.status = status;
              requestData.save();
              res.status(200).json({
                message:Cmessage.request.UNFRIEND,
                ManageRequestAck:Cmessage.condition.TRUE
              });
            }else{
              res.status(200).json({
                message:Cmessage.request.ALREADY_UNFRIEND,
                ManageRequestAck:Cmessage.condition.FALSE
              });
            }
          });
      }else{

        Request.findOne({$and:[
                  {requestFromId:id},
                  {requestToId:user_id},
                  {status:'pending'}
                ]},function(err,requestStatusChange){
          if(err){
            return res.sendStatus(400);
          }

          console.log(requestStatusChange);
          if(requestStatusChange){
            if(IsApproved === 'accepted') {   //If IsApproved is accepted
              var status = 'accepted';
            }else{
              var status = 'denied';       //If IsApproved is denied
            }
            //Update Status
            requestStatusChange.status = status;
            requestStatusChange.save();
            //Insert the Request
              var newRequest = new Request();
              newRequest.requestFromId = user_id;
              newRequest.requestToId = id;
              newRequest.status = status;
              newRequest.save();

              if(status === 'accepted'){
                res.status(200).json({
                  message:Cmessage.request.FRIEND_REQUEST,
                  ManageRequestAck:Cmessage.condition.TRUE
                });
              }else{
                res.status(200).json({
                    message:Cmessage.request.DENIED_REQUEST,
                    ManageRequestAck:Cmessage.condition.FALSE
                });
              }
          }else{
            res.status(200).json({
              message:Cmessage.request.ALREADY_DENIED,
              ManageRequestAck:Cmessage.condition.FALSE
            });
          }
        });
      }
    }
  }else{
      res.status(200).json({
        message:Cmessage.parameters.PROPER_VALUE,
        SendRequest:Cmessage.condition.FALSE
      });
  }
}; 

//8th Api filtercontact
exports.filterContact = function(req,res){
  var cntContact = req.body.Contacts;
  var id         = req.body.id;

  // Start Get User
  User.findOne({_id:id},function(err,userData){
    if(err){
      return res.sendStatus(400);
    }
    
    if(userData && cntContact && cntContact.length > 0)
    {
      var suggestThatUser = [];
      var normalUsers = [];

      // Start Get Request User
      Request.find({$and:[{requestToId:id},{status:'accepted'}]},function(err,requestData){
        if(err){
          return res.sendStatus(400);
        }
        
        var requestFromId = [];
        requestData.forEach(function(r){
          requestFromId.push(r.requestFromId);
        });
        
        User.find({
          $and:[{_id:{$ne:id}},{_id:{$nin:requestFromId}}]
        },function(err,usersData){
          if(err){
            return res.sendStatus(400);
          }
          
          var SuggestSearchArray = [];
          async.each(usersData,function(user,asyncCallback){            

            Request.find({$and:
              [{
                $or:[
                  {$and : [{requestFromId:user._id},{requestToId:id}]},
                  {$and : [{requestFromId:id},{requestToId:user._id}]},
                ]
               },
               {status:{$ne:'accepted'}
              }]
            },function(err,requestUsers){
              if(err){
                return res.sendStatus(400);
              }


              if(requestUsers && requestUsers.length > 0)
              {                
                var status  = (requestUsers[0].status != 'pending') ? 'ADD' : (requestUsers[0].requestFromId == id) ? 'SENT' : 'ACCEPT';
              }else{
                var status  = 'ADD';
              }
              var phone = 

              SuggestSearchArray.push({
                Status : status,
                UserId : user._id.toString(),
                Phone : user.phone,
                Countrycode : user.countryCode,
                Email : user.email,
                BirthDate : user.birthDate,
                UserName : user.userName,
                Photo : (user.photo && user.photo != '') ? user.photo : '',
                CreatedDate : moment(user.createdDate).format('YYYY-MM-DD'),
                UpdatedDate : moment(user.updatedDate).format('YYYY-MM-DD')
              });

              asyncCallback();

              

            });

          },function(err){
            if(err){
              return res.sendStatus(400);
            }
            

            cntContact.forEach(function(contact_value,contact_key){
              var Phone = contact_value.phone;              
              if(Phone && Phone != ""){
                var notmatch;
                SuggestSearchArray.forEach(function(value){
                  
                  if(Phone.slice(-10).length == 10 && Phone.slice(-10) == value.Phone)
                  {
                    var phone_code = Phone.slice(0,-10);
                    Phone = Phone.slice(-10);
                    in_flag = 1;
                  }else if(Phone.slice(-9).length == 9 && Phone.slice(-9) == value.Phone)
                  {
                    var phone_code = Phone.slice(0,-9);
                    Phone = Phone.slice(-9);
                    in_flag = 1;
                  }else if(Phone.slice(-8).length == 8 && Phone.slice(-8) == value.Phone)
                  {
                    var phone_code = Phone.slice(0,-8);
                    Phone = Phone.slice(-8);
                    in_flag = 1;
                  }else{
                    notmatch = 0;
                    var in_flag = 0;
                  }

                  if(in_flag == 1)
                  {
                      value.version = contact_value.version;
                      value.contact_id = contact_value.contact_id;                      

                      var country_code = general.getCountryCallingCode(value.Countrycode);                      
                      
                      if(phone_code == "" || phone_code == "0" || phone_code == "00" || phone_code == "000" )
                      {   
                          suggestThatUser.push(value);
                          notmatch = 1;
                          return false;
                      }
                      else if(phone_code == country_code)
                      {
                          suggestThatUser.push(value);
                          notmatch = 1;
                          return false;
                      }else{
                          notmatch = 0;
                      }
                  }else{
                     notmatch = 0; 
                  }

                }); // End SuggestSearchArray Foreach

                if(notmatch == 0){
                    contact_value.Status = 'ADD';
                    normalUsers.push(contact_value);                    
                }
              }
            }); // end contact forEach
            console.log(normalUsers);
            if((suggestThatUser && suggestThatUser.length > 0) || (normalUsers && normalUsers.length > 0))
            {
              res.status(200).json({
                SuggestThatUsers:suggestThatUser,
                NormalUsers:normalUsers,
                message:Cmessage.filtercontact.CONTACT_FOUND,
                FilterContactAck:Cmessage.condition.TRUE
              });
            }else{
              res.status(200).json({
                message:Cmessage.filtercontact.CONTACT_NOT_FOUND,
                FilterContactAck:Cmessage.condition.FALSE
              });
            }

          });
          
        });  //async end    
        
      });
      // End Get Request User

      
    }else{
      res.status(200).json({
        message:Cmessage.filtercontact.USER_NOT_FOUND,
        FilterContactAck:Cmessage.condition.FALSE
      });      
    }
  });
  // End Get User
   
};

//9th Api myfriends
exports.myFriends = function(req,res){
  var id = req.body.id;
  if(id){
    Request.find({$and:[{requestToId:id},{status:'accepted'}]}).populate('requestFromId').exec(function(err,requestData){
      if(err){
        return res.sendStatus(400);
      }
      if(requestData && requestData.length>0){

        var MyFriends = [];

        requestData.forEach(function(request){
          var requestFrom_Id = request.requestFromId._id.toString();
          MyFriends.push({
            'Id':requestFrom_Id,
            'Email':request.requestFromId.email,
            'Phone':request.requestFromId.phone,
            'DOB':request.requestFromId.birthDate,
            'UserName':request.requestFromId.userName,
            'Email':request.requestFromId.email,
            'Photo':(request.requestFromId.photo) ? request.requestFromId.photo : '',
            'RegisteredDate':moment(request.requestFromId.createdDate).format('YYYY-MM-DD'),
            'Status':request.status
          });
        });
        
        res.status(200).json({
           MyFriends:MyFriends,
           NumofFriends:{
              Total: requestData.length
           },
           message:Cmessage.request.FRIENDS_LIST,
           MyFriendsAck:Cmessage.condition.TRUE
        });
        
      }else{
        res.status(200).json({
          message:Cmessage.request.FRIEND_NOT_FOUND,
          MyFriendsAck:Cmessage.condition.FALSE
        });
      }
    });
  }else{
    res.status(200).json({
        message:Cmessage.request.ENTER_USERID,
        MyFriendsAck:Cmessage.condition.FALSE
    });
  }
};

//14th Api userprofile
exports.userProfileInfo = function(req,res){
  var id = (req.body.id)?req.body.id:'';
  var logedinid = (req.body.logedinid)?req.body.logedinid:'';
  if(logedinid && logedinid != ''){
    if(id!= '' && id!= logedinid){

      
      User.findOne({_id:id},function(err,userData){
        if(err){
          return res.sendStatus(400);
        }
        if(userData)
        {
          
          Request.find({$or:[{requestToId:logedinid,requestFromId:id},{requestFromId:id,requestToId:logedinid}]}).
          exec(function(err,requestData){
            if(err){
              return res.sendStatus(400);
            }
            
            if(requestData && requestData != '')
            {              
              var status = (requestData[0].status == 'accepted') ? 'FRIENDS' : (requestData[0].status != 'pending') ? 'ADD' : (userData._id == '1') ? 'SENT' : 'ACCEPT';
            }else{
              var status = "ADD";
            }

            var data = {
              Id:userData._id.toString(),
              Email:userData.email,
              Phone:userData.phone,
              DOB:(userData.birthDate)?moment(userData.birthDate).format('DD/MM/YYYY'):'',         //Changes For Migration     
              UserName:userData.userName,
              Photo:(userData.photo)?userData.photo:'',
              Phone:userData.phone,
              RegisteredDate:moment(userData.createdDate,'YYYY-MM-DD'),
              Status:status
            };
            res.status(200).json({
                User:data,
                message:"User information found.",
                UserProfileAck:"true"
            }); 
          }); 
        }
      });
    }else{
      User.findOne({_id:logedinid},function(err,userData){
        if(err){
          return res.sendStatus(400);
        }
        if(userData)
        {
          var data = {
            Id:userData._id.toString(),
            Email:userData.email,
            Phone:userData.phone,
            DOB:(userData.birthDate)?moment(userData.birthDate).format('DD/MM/YYYY'):'', //Changes For Migration
            UserName:userData.userName,
            Photo:(userData.photo)?userData.photo:'',
            RegisteredDate:moment(userData.createdDate).format('YYYY-MM-DD'),
            Status:''
          };
          res.status(200).json({
              User:data,
              message:"User information found.",
              UserProfileAck:"true"
          }); 
        }
      });
    }
  }else{
    res.status(200).json({
        message:"Please enter valid parameter.",
        MyFriendsAck:"false"
    });
  }
};



//13th Api searchfriends
exports.searchFriends = function(req,res){
    var id = (req.body.id)?req.body.id.trim():'' //User that is serarching his friends
    var name = (req.body.search)?req.body.search.trim():'';
    if(id && id!=='' && name && name!== ''){
      User.find({$and:[
        {_id:{$ne:id}},
        {userName:{'$regex': name}}
        ]},function(err,userData){
        if(err){
          return res.sendStatus(400);
        }

        if(userData){
          //console.log(userData);
           var request = [];
          userData.forEach(function(user){
            
            var date = new Date(user.birthDate);      
            var DOB = (user.birthDate)?moment(user.birthDate,'MM/DD/YYYY'):'';
            if(date == 'Invalid Date')
            {
              DOB = '';
            }
            
            request.push({
                        'Status':'ADD',
                        'Id':user._id.toString(),
                        'UserName':user.userName,
                        'Phone':user.phone,
                        'Email':user.email,
                        'DOB':DOB,
                        'Photo':(user.photo)?user.photo:''
                        });
          });
          if(request && request.length>0){
            res.status(200).json({
              AllFriendList:request,
              message:Cmessage.searchfriends.ALL_FRIEND,
              SearchFriendsAck:Cmessage.condition.TRUE
            });
          }else{
            res.status(200).json({
              message:Cmessage.searchfriends.NO_FRIEND,
              SearchFriendsAck:Cmessage.condition.FALSE
            });
          }
        }
      }); //End User data
    }else{
      res.status(200).json({
        message:Cmessage.parameters.MESSAGE,
        SearchFriendsAck:Cmessage.condition.FALSE
      });
    }

          
          /*
          Request.find({status:'accepted'})
              .populate('requestFromId')
              .populate('requestToId')
              .exec(function(err,requestData){
            if(err){
              return res.sendStatus(400);
            }
            if(requestData){
              console.log(requestData);
              var request = [];
              requestData.forEach(function(request){
                if(request.requestFromId._id == id || request.requestToId._id == id){
                    request.push({'Status':(request.status)?request.status:'ADD'})
                }
              });
              
            }
          });*/
      
};

//36th Api Friend Request
exports.friendRequest = function(req,res){
  var id = (req.body.id)?req.body.id.trim():'';
  if(id && id!==''){
    //Get FRIEND REQUEST - START
    Request.find({$and:[
          {requestToId:id},{status:'pending'}
        ]})
    .populate('requestFromId').exec(function(err,requestfriendData){
      if(err){
        return res.sendStatus(400);
      }
      var data = [];
      if(requestfriendData && requestfriendData.length > 0){
         var friendData = [];
        requestfriendData.forEach(function(requestfriend){          
          if(requestfriend.requestFromId != null)
          {
            var photo = (requestfriend.requestFromId.photo)?requestfriend.requestFromId.photo :'';
            friendData.push({
              'Status':'ACCEPT',
              'Id':requestfriend.requestFromId._id.toString(),
              'UserName':requestfriend.requestFromId.userName,
              'Phone':requestfriend.requestFromId.phone,
              'Email':requestfriend.requestFromId.email,
              'DOB':requestfriend.requestFromId.birthDate,'Photo':photo
            });  
          }          
        });
        res.status(200).json({
          friendrequest:friendData,
          message:Cmessage.friendrequest.FRIEND_REQUEST,
          AlertAck:Cmessage.condition.TRUE
        });
      }else{
        res.status(200).json({
          friendrequest:data,
          message:Cmessage.friendrequest.NO_FRIEND_REQUEST,
          AlertAck:Cmessage.condition.FALSE
        });
      }
    });
  }else{
    res.status(200).json({
      message:Cmessage.parameters.PROPER_VALUE,
      AlertAck:Cmessage.condition.FALSE
    });
  }
};