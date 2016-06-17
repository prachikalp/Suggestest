'use strict';

var Group = require('../models/group.server.model'),
    GroupMember = require('../models/groupmember.server.model'),
    GroupComment = require('../models/groupcomment.server.model'),
    User  = require('../models/user.server.model'),
    Request = require('../models/request.server.model'),
    general = require('../helpers/general'),
    fs = require('fs'),
    fse = require('fs-extra'),
    moment = require('moment-timezone'),
    async  = require('async'),
    path       = require('path'),
    gcm     = require('android-gcm'),
    apn     = require('apn'),
    config  = require('../../config/config'),
    awsSdk  = require('../../config/aws-sdk'), //Include aws file for uploading in s3 bucket
    Cmessage = require('../helpers/common');  // added common.js file

exports.createGroup = function(req,res) {
  var user_id = (req.body.user_id)?req.body.user_id.trim():'';
  var timezone = (req.body.timezone)?req.body.timezone.trim():'+00:00';
  var group_id = (req.body.group_id)?req.body.group_id.trim():'';
  var groupType = (req.body.groupType)?req.body.groupType.trim():'';
  var group_description = (req.body.group_description)?req.body.group_description.trim():'';
  var location = (req.body.location)?req.body.location.trim():'';
  var type_id = (req.body.type)?req.body.type.trim():'';
  var category_id = (req.body.category)?req.body.category.trim():'';
  var group_name = (req.body.group_name)?req.body.group_name.trim():'';
  var group_image = (req.files.group_image)?req.files.group_image:'';

  if(group_name!== '' && category_id!== '' && user_id!=='' && groupType!== ''){
      if(group_id!== '' && groupType == 'EDIT'){  //On success = Update record

        //Get Group Data
        Group.findOne({$and:[
            {deleted:0},
            {_id:group_id}
          ]})
        .populate('createdBy')
        .populate('category')
        .populate('type')
        .exec(function(err,groupData){
          if(err){
            return res.sendStatus(400);
          }
          if(groupData){  //groupData found        
            Group.find({$and:[
                {deleted:0},
                {groupName:group_name},
                {_id:{$ne:group_id}}
              ]}).exec(function(err,groupData1){
                if(err){
                   return res.sendStatus(400);
                }
                if(groupData1 && groupData1.length>0){ //groupData1 found
                  res.status(200).json({
                    message:Cmessage.creategroup.GROUP_NAME_EXISTS,
                    GroupUpdateAck:Cmessage.condition.FALSE
                  });
                }else{
                    //Condition for different update data Update group Data ny group_id
                    Group.findOne({_id:group_id})
                      .populate('createdBy')
                      .populate('type')
                      .populate('category')
                      .exec(function(err,groupData2){
                      if(err){
                        return res.sendStatus(400);
                      }
                      if(groupData2){
                        
                        if(group_name!== ''){
                          groupData2.groupName = group_name;
                        }
                        
                        if(category_id!== ''){
                          groupData2.category = category_id;
                        }

                        if(type_id!== ''){
                          groupData2.type = type_id;
                        }

                        if(location!== ''){
                            groupData2.location = location;
                        }

                        if(group_description!== ''){
                          groupData2.groupDescription = group_description;
                        }

                        if(group_image!== ''){
                          
                          if(groupData2.awsImageUrl!== ''){
                            console.log("Group Image deleted");
                            awsSdk.deleteAWSFile(groupData2.groupImage,2);
                          }
                          
                          var timestamp = new Date().getTime();
                          var ext1 = group_image.extension;
                          var groupimgtimeext = timestamp+"."+ext1;
                          var groupimgext = ext1;
                          var groupimgfile = timestamp +"_"+group_image.originalname;
                          var groupimgpath = group_image.path;

                          groupData2.groupImage = groupimgfile;
                          groupData2.groupImage = group_image.name;
                          //Move file upload to specific directory

                          if(fs.existsSync(groupimgpath)){                            
                            var awsImage_url  = awsSdk.uploadAWSFile(groupimgpath,2); //Upload section for amazon url is left
                            // end of file upload...mp3,mp4,image.....
                            if(awsImage_url && awsImage_url!==0){
                              groupData2.awsImageUrl = awsImage_url;                                
                            }
                            // Remove Local Image                            
                            fs.unlink(groupimgpath);                            
                          }  
                        }

                        //Save Group
                        groupData2.save();
                        
                        //Get Group Data
                        Group.findOne({_id:group_id})
                        .populate('createdBy')
                        .populate('type')
                        .populate('category') 
                        .exec(function(err,updgroupData){
                          var data = [];
                          var groupImage =  (updgroupData.awsImageUrl)?updgroupData.awsImageUrl:'';
                          var groupDescription = (updgroupData.groupDescription)?updgroupData.groupDescription:'';
                          var createdAt = moment(updgroupData.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD HH:mm:ss');
                          var Photo = (updgroupData.createdBy.photo)?updgroupData.createdBy.photo:config.baseUrl.url+'public/uploads/files/user/nouser.jpg';
                          var type = (updgroupData.type.name)?updgroupData.type.name:'';
                          var category = (updgroupData.category.title)?updgroupData.category.title:'';
                          data.push({'group_id':updgroupData._id,'group_name':updgroupData.groupName,
                                    'location':updgroupData.location,'group_image':groupImage,
                                    'group_description':groupDescription,'created_at':createdAt,
                                    'group_owner_photo':Photo,'type':type,'category':category,'group_owner':updgroupData.createdBy.userName
                                    });

                          res.status(200).json({
                            GroupDetail:data,
                            message:Cmessage.creategroup.GROUP_UPDATED,
                            GroupUpdateAck:Cmessage.condition.TRUE
                          });
                        });
                      } //Updated Data
                    }); //End Update Group Data
                } //grouoData1 not found   
              }); //End groupData1
          }else{    //groupData not found
            res.status(200).json({
              message:Cmessage.creategroup.GROUP_NOT_FOUND,
              GroupUpdateAck:Cmessage.condition.FALSE
            });
          }
        }); //End Group Data          
      }else{  //groupType is ADD
        if(groupType == 'ADD'){  // groupType is ADD
          //Get Group data
          Group.find({$and:[
              {deleted:0},
              {groupName:group_name}
            ]}).exec(function(err,groupData){
              if(err){
                return res.sendStatus(400);
              }
              if(groupData && groupData.length > 0){  //groupData is found
                res.status(200).json({
                  message:Cmessage.creategroup.GROUP_NAME_EXISTS,
                  GroupCreateAck:Cmessage.condition.FALSE
                });
              }else{       //groupData is not found
                var awsImage_url = '';
                var groupimage_name = '';
                if(group_image && group_image!==''){
                    //start of file upload...mp3,mp4,image.
                    var timestamp = new Date().getTime();
                    var ext1 = group_image.extension;
                    var groupimgtimeext = timestamp+"."+ext1;
                    var groupimgext = ext1;
                    var groupimgfile = timestamp +"_"+group_image.originalname;
                    var groupimgpath = group_image.path;
                    groupimage_name = group_image.name;

                    if(fs.existsSync(groupimgpath)){
                      //Move file upload to AWS S3 Bucket
                      awsImage_url  = awsSdk.uploadAWSFile(groupimgpath,2); //Upload section for amazon url is left
                      // Remove Local Image                            
                      fs.unlink(groupimgpath);                      
                    }                  
                }

                var newGroup = new Group();
                newGroup.groupName = group_name;
                newGroup.category = category_id;
                newGroup.type =  type_id;
                newGroup.location =  location;
                newGroup.groupImage = groupimage_name;
                newGroup.awsImageUrl = awsImage_url;
                newGroup.groupDescription = group_description;
                newGroup.createdBy = user_id;
                newGroup.createdAt = moment().format('YYYY-MM-DD HH:mm:ss');
                newGroup.save(function(err,insertGroup){
                    if(err){
                      console.log(err);
                      //return res.sendStatus(400);
                    }
                    if(insertGroup){
                      var id =insertGroup._id;
                      Group.findOne({_id:id})
                      .populate('category')
                      .populate('type')
                      .populate('createdBy')
                      .exec(function(err,groupValue){
                          if(err){
                            console.log(err);
                            //return res.sendStatus(400);
                          }
                          //console.log(groupValue);
                          if(groupValue){
                            var data = [];
                            var groupImage = (groupValue.awsImageUrl)?groupValue.awsImageUrl:'';
                            var groupDescription = (groupValue.groupDescription)?groupValue.groupDescription:'';
                            var createdAt = moment(groupValue.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD HH:mm:ss');
                            var Photo = (groupValue.createdBy.photo)?groupValue.createdBy.photo:'';
                            var type = (groupValue.type.name)?groupValue.type.name:'';
                            var category = (groupValue.category.title)?groupValue.category.title:'';
                            data.push({
                              'group_id':groupValue._id,
                              'group_name':groupValue.groupName,
                              'location':groupValue.location,
                              'created_at':createdAt,
                              'group_owner_photo':Photo,
                              'type':type,
                              'category':category,
                              'group_owner':groupValue.createdBy.userName
                            });
                            res.status(200).json({
                              GroupDetail:data,
                              message:Cmessage.creategroup.CREATE_GROUP,
                              GroupCreateAck:Cmessage.condition.TRUE
                            });
                          }
                      }); //End Find Group Data   
                    }else{
                      res.status(200).json({
                        message:Cmessage.creategroup.FAILED_CREATE_GROUP,
                        GroupCreateAck:Cmessage.condition.FALSE
                      });
                    }
                }); //Insert Group Data  
              }
          }); //End groupData 
        }else{ //groupType is not Add
          res.status(200).json({
            message:Cmessage.creategroup.GROUP_NOT_FOUND,
            GroupUpdateAck:Cmessage.condition.FALSE
          });
        }
      }
  }else{
    if(user_id == ""){
      res.status(200).json({
        message:Cmessage.creategroup.USER_NOT_LOGIN,
        GroupCreateAck:Cmessage.condition.FALSE
      });
    }else{
      res.status(200).json({
        message:Cmessage.creategroup.REQUIRED_FIELDS,
         GroupCreateAck:Cmessage.condition.FALSE
      });
    }
  }
};

exports.groupdetail = function(req,res){

  var user_id = (req.body.user_id)?req.body.user_id.trim():'';
  var group_id = (req.body.group_id)?req.body.group_id.trim():'';
  var timezone = (req.body.timezone)?req.body.timezone.trim():'+00:00';
  if(user_id!=='' && group_id!== ''){
    //Get Group Data 
    Group.findOne({_id:group_id})
    .populate('createdBy')
    .populate('category')
    .populate('type')    
    .exec(function(err,groupData){
      if(err){
        return res.sendStatus(400);
      }
      if(groupData){
        var groupsData = [];

        var groupImage = (groupData.awsImageUrl)?groupData.awsImageUrl:groupData.groupImage;
        var group_create_time = moment(groupData.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD');
        var group_name = groupData.groupName;
        var group_owner = groupData.createdBy.userName;        
        var group_owner_photo = (groupData.createdBy.photo)?groupData.createdBy.photo:config.baseUrl.url+'public/uploads/files/user/nouser.jpg';
        var category_id = (groupData.category._id)?groupData.category._id:'';
        var category_name = (groupData.category.title)?groupData.category.title:'';
        var type_id = (groupData.type._id)?groupData.type._id:'';
        var type_name = (groupData.type.name)?groupData.type.name:'';

        groupsData.push({
                        "group_id": groupData._id.toString(),
                        "group_name": group_name,
                        "location": groupData.location,
                        "group_image": groupImage,
                        "group_description": groupData.groupDescription,
                        "group_owner_id": groupData.createdBy._id.toString(),
                        "category_id": category_id.toString(),
                        "type_id": type_id.toString(),
                        "created_at": group_create_time,
                        "group_owner_photo": group_owner_photo,
                        "category_name": category_name,
                        "type_name": type_name,
                        "group_owner": group_owner
                      });

        res.status(200).json({
          GroupDetail:groupsData,
          message:'Group Detail',
          GroupDetailAck:'true'
        });

      }else{
        res.status(200).json({
          message:'Group Detail not found',
          GroupDetailAck:'false'
        });
      }
    });
  }else{
    if(user_id == "")
    {
      var message = 'User not Logged In';
    }else{
      var message = 'Please fillUp all required fields.';
    }
    res.status(200).json({
      message:message,
      GroupDetailAck:'false'
    });
  }
                
};

//39. Group List is LEFT
exports.groupList = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id.trim():'';
  var my_group = (req.body.my_group)?req.body.my_group:'0';
  var search_category = (req.body.search_category_id)?req.body.search_category_id.trim():'';
  var search_type = (req.body.search_type_id)?req.body.search_type_id:'';
  var search_location = (req.body.search_location)?req.body.search_location.trim():'';
  var start = (req.body.start)?req.body.start:0;
  var count = (req.body.count)?req.body.count:10;
  var timezone = (req.body.timezone)?req.body.timezone:'+00:00';

  if(user_id!== '' && (my_group == '1' || my_group == '0')){
    var condition = [];
    if(search_category!=='' ){
      condition.push({category:search_category});
    }
    if(search_type!=='')
    {
      condition.push({type:search_type});
    }
    if(search_location!=='')
    {
      condition.push({location:{'$regex': search_location}});
    }

    condition.push({deleted:0});   //Changes in migration

    GroupMember.find({
      $and:[
        {$or:[{fromUserId:user_id},{toUserId:user_id}]},
        {status:1}
      ]
    }).select('groupId').exec(function(err,groupMemberId){
      if(err){
        return res.sendStatus(400);
      }
      var groupIds = [];
      groupMemberId.forEach(function(group){          
        groupIds.push(group.groupId);
      }); 

    if(my_group == '1'){
        condition.push({$or:[{createdBy:user_id},{_id:{$in:groupIds}}]});
        Group.find({$and:condition})
              .populate('type')
              .populate('category')
              .populate('createdBy')
              .exec(function(err,groupData){
                if(err){                
                  return res.sendStatus(400);
                }
               
                var groups = [];            
                groupData.forEach(function(group){
                    
                    var group_owner_photo = (group.createdBy.photo && group.createdBy.photo != '') ? group.createdBy.photo : '';
                    var is_your_group = ((group.createdBy._id && group.createdBy._id == user_id) || (groupIds.indexOf(group._id) > -1)) ? 'true' : 'false';                  
                    var category = (group.category && group.category.title)?(group.category.title):'';
                    
                    groups.push({
                      "group_id": group._id.toString(),
                      "group_name": group.groupName,
                      "location": group.location,
                      "group_image": group.awsImageUrl, 
                      "group_description": group.groupDescription, 
                      "created_at": moment(group.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD'),
                      "group_owner_photo": group_owner_photo,
                      "is_your_group": is_your_group,
                      "type": (group.type && group.type.name)?group.type.name:'',
                      "type_id": (group.type && group.type._id)?group.type._id.toString():'',
                      "category": (group.category && group.category.title)?(group.category.title):'',
                      "category_id": (group.category && group.category._id)?group.category._id.toString():'',
                      "group_owner": group.createdBy.userName,
                      "group_owner_user_id": group.createdBy._id.toString()
                    });
                });
                res.status(200).json({
                  TotalGroup:groups.length,
                  GroupList:groups,
                  message:Cmessage.grouplist.GROUP_LIST,
                  GroupListAck:Cmessage.condition.TRUE
                });

        });
    }else{
      Group.find({$and:condition})
            .populate('type')
            .populate('category')
            .populate('createdBy')
            .exec(function(err,groupData){
              if(err){
                console.log(err);
                return res.sendStatus(400);
              }

              var groups = [];            
              groupData.forEach(function(group){                  
                  var group_owner_photo = (group.createdBy.photo && group.createdBy.photo != '') ? group.createdBy.photo : '';                  
                  var is_your_group = ((group.createdBy._id && group.createdBy._id == user_id) || (groupIds.indexOf(group._id) > -1)) ? 'true' : 'false';                  
                  var group_image = (group.awsImageUrl && group.awsImageUrl != '') ? group.awsImageUrl : '';                  

                  groups.push({
                    "group_id": group._id.toString(),
                    "group_name": group.groupName,
                    "location": group.location,
                    "group_image": group.awsImageUrl, 
                    "group_description": group.groupDescription, 
                    "created_at": moment(group.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD'),
                    "group_owner_photo": group_owner_photo,
                    "is_your_group": is_your_group,
                    "type": (group.type && group.type.name)?(group.type.name):'', //Changes in migration
                    "type_id":(group.type && group.type._id)?group.type._id.toString():'',  //Changes in migration
                    "category": (group.category && group.category.title)?(group.category.title):'',  //Changes in migration
                    "category_id":(group.category && group.category._id)?group.category._id.toString():'',  //Changes in migration
                    "group_owner": group.createdBy.userName,
                    "group_owner_user_id": group.createdBy._id.toString()
                  });

              });

              res.status(200).json({
                TotalGroup:groups.length,
                GroupList:groups,
                message:Cmessage.grouplist.GROUP_LIST,
                GroupListAck:Cmessage.condition.TRUE
              });
              
      });
    } 

    });
  }else{
    if(user_id == ''){
      res.status(200).json({
        message:Cmessage.grouplist.USER_NOT_LOGIN,
        GroupListAck:Cmessage.condition.FALSE
      });
    }else{
      res.status(200).json({
        message:Cmessage.grouplist.REQUIRED_FIELDS,
        GroupListAck:Cmessage.condition.FALSE
      });
    }
  }
};

//40. Send Request to join a Group (LEFT)
exports.requestForJoinGroup = function(req,res){
  var group_id = (req.body.group_id)?req.body.group_id.trim():'';
  var to_user_id = (req.body.to_user_id)?req.body.to_user_id.trim():'';
  var user_id = (req.body.user_id)?req.body.user_id.trim():'';
  var from_user_id = user_id;
  var current_date = moment().format('YYYY-MM-DD HH:mm:ss');

  if(group_id!== '' && from_user_id!=='' && to_user_id!=='')
  {
    //Get Group Data
    Group.findOne({$and:[
        {_id:group_id},
        {deleted:0}  //Changes in migration
    ]}).exec(function(err,groupData){
      if(err){
        return res.sendStatus(400)  ;
      }
      
      if(groupData)
      {
        // Check User
        User.findOne({_id:user_id}).count().exec(function(err,userCount){
          if(err){
            return res.sendStatus(400);
          }

          if(userCount)
          { 
            // Get Group Admin
            Group.findOne({$and:[
                {_id:group_id},
                {createdBy:user_id}
            ]}).count().exec(function(err,groupUserData){
              if(err){
                return res.sendStatus(400);
              }
              if(groupUserData){
                var group_admin = '1';
              }else{
                var group_admin = '0';
              }

              var group_name = groupData.groupName;
              var invite_user = to_user_id.split(',');
              var cnt = 0;
              
              async.each(invite_user,function(i_user,asyncCallback){
                //Get Group Member
               // to_user_id = i_user;
               if(i_user)
               {                  
                  GroupMember.find({$and:[
                      {groupId:group_id},
                      {
                        $or:[
                          {
                            $and:[
                              {fromUserId:from_user_id},
                              {toUserId:i_user}
                            ]
                          },
                          {
                            $and:[
                              {fromUserId:i_user},
                              {toUserId:from_user_id}
                            ]
                          }
                        ]}
                  ]}).exec(function(err,groupMemberData){
                    if(groupMemberData && groupMemberData.length > 0){
                      asyncCallback();  
                    }else{
                      var newGroupMember = new GroupMember();
                          newGroupMember.groupId = group_id;
                          newGroupMember.fromUserId = from_user_id;
                          newGroupMember.toUserId = i_user;
                          newGroupMember.createdAt = current_date;
                          newGroupMember.save(function(err,groupMemberId){
                            if(err){
                              return res.sendStatus(400);
                            }
                            if(groupMemberId){
                              cnt++;

                              /* SEND PUSH NOTIFICATION FOR SEND GROUP MEMBER REQUEST  */
                              // NEED TO CHECK NOTIFICATION
                              //Get User Token and DeviceType                          
                              general.getUserDeviceToken(i_user,function(userToken){
                                var usestokens = userToken;
                                //Get Device Type
                                general.getDeviceType(i_user,function(userDeviceType){
                                  var device_type = userDeviceType;

                                  if(usestokens && usestokens!==''){
                                    //Get Username from_user_id
                                    general.getUserName(from_user_id,function(userName){

                                      var fromname = userName;
                                      var type = '';
                                      var capitalfromName = fromname.charAt(0).toUpperCase() + fromname.substr(1);
                                      
                                      var group_name_up = group_name.charAt(0).toUpperCase() + group_name.substr(1);
                                      
                                      if(group_admin == '1'){                
                                          var message = capitalfromName+' has invited you to join '+ group_name_up;
                                         
                                      }else{
                                        var message = capitalfromName+'  wants to join  '+group_name_up;
                                      }
                                     
                                      var token = usestokens;
                                      //Push Message
                                      if(device_type == 'IPHONE'){
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
                                        //note.badge = 3;
                                        note.sound = "default";
                                        note.alert =  message;
                                        note.payload = {'type':3};
                                                                                
                                        apnConnection.pushNotification(note, myDevice);
                                        console.log(note);
                                        //Push Code
                                      }else{
                                        
                                          var regTokens = [];
                                          regTokens.push(token);
                                          // initialize new androidGcm object 
                                          var gcmObject = new gcm.AndroidGcm('AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc');
                                           
                                          // create new message 
                                          var message = new gcm.Message({
                                              registration_ids: regTokens,
                                              data: {
                                                "message" : {'message':message,
                                                "type":3
                                                }                                         
                                              }
                                          });

                                          gcmObject.send(message, function(err, response) {
                                            if(err) console.error(err);
                                              else    console.log(response);
                                          });
                                      }

                                    });
                                  }

                                });
                                //End Get Device Type
                              });
                              //End Get User Token and DeviceType                          
                              asyncCallback();   
                            }
                          }); //End Of Insert Group Member
                    }      
                  });
                  //End Get Group Member
                }else{
                  asyncCallback();  
                }                
                        
              },function(err){                
                if(group_admin == '1'){
                  var res_message = Cmessage.requestforjoingroup.INVITATION_SENT;
                  var err_messsage = Cmessage.requestforjoingroup.ALREADY_INVITATION_SENT;
                }else{
                  var res_message = Cmessage.requestforjoingroup.JOIN_REQUEST;
                  var err_messsage = Cmessage.requestforjoingroup.ALREADY_JOIN_REQUEST;
                }
                
                if(cnt > 0){
                  res.status(200).json({
                    message:res_message,
                    GroupMemberAck:Cmessage.condition.TRUE
                  });
                }else{
                  res.status(200).json({
                    message:err_messsage,
                    GroupMemberAck:Cmessage.condition.FALSE
                  });
                } 
              });
              
            });
            // End Get Group Admin

          }else{  //User is not Valid
            res.status(200).json({
                message:Cmessage.requestforjoingroup.USER_INVALID,
                UserValidAck:Cmessage.condition.FALSE
            });
          }// End if userCount

        });
        // End Check User

      }else{
        res.status(200).json({
          message:Cmessage.requestforjoingroup.GROUP_NOT_FOUND,
          GroupMemberAck:Cmessage.condition.FALSE
        });
      }
    });
    //End Group Data   

  }else{
    if(user_id == ''){
      res.status(200).json({
        message:Cmessage.requestforjoingroup.USER_NOT_LOGIN,
        GroupMemberAck:Cmessage.condition.FALSE
      });
    }else{
      res.status(200).json({
        message:Cmessage.requestforjoingroup.REQUIRED_FIELDS,
        GroupMemberAck:Cmessage.condition.FALSE
      });
    }
  }

};

//41st Api Get a Group Request List Proper Sequence
exports.groupRequestList = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id.trim():'';
  var timezone = (req.body.timezone)?req.body.timezone.trim():'+00:00';

  if(user_id!==''){
    //Get GroupMember Data
    GroupMember.find({$and:[
      {toUserId:user_id},
      {status:0}
    ]})
    .populate('groupId')
    .populate('fromUserId')
    .exec(function(err,groupMemberData){
      if(err){
        return res.sendStatus(400);
      }
      if(groupMemberData){
        var data = [];
        groupMemberData.forEach(function(groupMember){
          var createdAt = moment(groupMember.groupId.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD HH:mm:ss');
          var Photo = (groupMember.fromUserId.photo)?groupMember.fromUserId.photo:config.baseUrl.url+'public/uploads/files/user/nouser.jpg'; 
          data.push({
            'group_name':groupMember.groupId.groupName,
            'group_admin_id':groupMember.groupId.createdBy.toString(),
            'from_user_id':groupMember.fromUserId._id.toString(),
            'to_user_id':groupMember.toUserId.toString(),
            'group_id':groupMember.groupId._id.toString(),
            'group_image':groupMember.groupId.awsImageUrl,
            'created_at':createdAt,
            'sender_UserName':groupMember.fromUserId.userName,
            'sender_photo':Photo,
            'group_members_id':groupMember._id.toString()
          });
        });
        if(data && data.length > 0){
          res.status(200).json({
            GroupRequest:data,
            message:Cmessage.grouprequestlist.GROUP_REQUEST,
            GroupRequestAck:Cmessage.condition.TRUE
          });
        }else{
          console.log('No Group Request');
          res.status(200).json({
            message:Cmessage.grouprequestlist.GROUP_REQUEST_NOT_FOUND,
            GroupRequestAck:Cmessage.condition.FALSE
          });
        }
      }
    }); //End GroupMember Data
  }else{
    res.status(200).json({
      message:Cmessage.grouprequestlist.USER_NOT_LOGIN,
      GroupRequestAck:Cmessage.condition.FALSE
    });
  }
};

//42nd Api Group Request Update (Accept/Reject) Push Notification is left
exports.groupRequestStatusUpdate = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id:'';
  var group_members_id = (req.body.group_members_id)?req.body.group_members_id:'';
  var group_members_request_status = (req.body.group_members_request_status)?req.body.group_members_request_status:'';
  var arrResultDetails = [];

  if(group_members_request_status == '1' || group_members_request_status == '2'){
    var request_status = group_members_request_status;
  }else{
    res.status(200).json({
      message:Cmessage.grouprequeststatusupdate.STATUS_INVALID,
      GroupRequestStatusUpdateAck:Cmessage.condition.FALSE
    });
  }
  if(user_id !== '' && group_members_id!=='' && request_status!==''){
    //Get  Group Member Data
    GroupMember.findOne({$and:[
        {_id:group_members_id},
        {status:0},
        {$or:[{fromUserId:user_id},{toUserId:user_id}]}
    ]}).populate('groupId').exec(function(err,groupMemberData){
        if(err){
          return res.sendStatus(400);
        }
        if(groupMemberData){  //If Group Member Data Found

          var from_user_id = groupMemberData.fromUserId;
          var to_user_id = groupMemberData.toUserId;
          var group_name = groupMemberData.groupId.groupName;
          var group_id = groupMemberData.groupId._id;
          var group_created_by = groupMemberData.groupId.createdBy;
            //Get User Token and deviceType
            User.findOne({_id:from_user_id},function(err,userData){
              if(err){
                return res.sendStatus(400);
              }
              var usestokens = userData.token;
              var device_type = userData.deviceType;

                general.getUserName(to_user_id,function(userName){

                  var to_name = userName;
                  
                  general.getUserName(group_created_by,function(useradminNameData){
                   var admin_created_by_name = useradminNameData;
                   
                      if(request_status == '1'){
                        //Get GroupMember Data and Update
                        GroupMember.findOne({_id:group_members_id},function(err,groupMemberData){
                          if(err){
                            return res.sendStatus(400);
                          }
                          if(groupMemberData){
                            groupMemberData.status = request_status;
                            groupMemberData.save();
                          }
                        });//End GroupMember Data
                         var groupName = group_name.charAt(0).toUpperCase() + group_name.substr(1);
                        if(group_created_by == user_id){
                         
                          var message = admin_created_by_name+ Cmessage.grouprequeststatusupdate.ACCEPTED_REQUEST +groupName;
                        }else{
                          var message = to_name+ Cmessage.grouprequeststatusupdate.ACCEPTED_REQUEST + groupName;
                        }
                        arrResultDetails.push({message});
                        console.log(message);
                      }else{
                        //Group Member Data
                        GroupMember.remove({$and:[
                          {_id:group_members_id},
                          {toUserId:user_id}
                        ]}).exec(function(err,removeGroupMember){
                            if(err){
                              return res.sendStatus(400);
                            }
                        }); //Remove GroupMember Data
                        var groupName = group_name.charAt(0).toUpperCase() + group_name.substr(1);
                        if(group_created_by == user_id){
                          var message = admin_created_by_name+Cmessage.grouprequeststatusupdate.DECLINED_REQUEST+groupName;
                        }else{
                          var message = to_name+Cmessage.grouprequeststatusupdate.DECLINED_REQUEST+groupName;
                        }
                        arrResultDetails.push({message});
                        console.log(message);
                      }
                      /* SEND PUSH NOTIFICATION FOR Confirmation of Accept/Decline */
                      if(usestokens && usestokens!==''){
                        var type = '';
                        var token = usestokens;
                        //Push Message Code left
                        if(device_type == 'IPHONE'){
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
                            //note.badge = 3;
                            note.sound = "default";
                            note.alert =  message;
                            note.payload = {'type':3};
                            
                            apnConnection.pushNotification(note, myDevice);
                            console.log(note);
                        }else{
                            var regTokens = [];
                            regTokens.push(token);
                            console.log('Registered Tokens'+regTokens);
                            // initialize new androidGcm object 
                            var gcmObject = new gcm.AndroidGcm('AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc');
                             
                            // create new message 
                            var message = new gcm.Message({
                                registration_ids: regTokens,
                                data: {
                                  "message" : {"message":message,"type":3}
                                }
                            });

                            gcmObject.send(message, function(err, response) {
                              if(err) console.error(err);
                                else    console.log(response);
                            });
                        }
                         //General Function
                       
                      }
                      res.status(200).json({
                          message:message,
                          GroupRequestStatusUpdateAck:Cmessage.condition.TRUE
                    });
                  });
                 
                }); //End User Data

            }); //End User Data
              
                 
        }else{
          res.status(200).json({
            message:Cmessage.grouprequeststatusupdate.GROUP_NOT_FOUND,
            GroupRequestStatusUpdateAck:Cmessage.condition.FALSE
          });
        } 
    }); //End Group Member Data
  }else{
    res.status(200).json({
      message:Cmessage.grouprequeststatusupdate.USER_NOT_LOGIN,
      GroupRequestStatusUpdateAck:Cmessage.condition.FALSE
    });
  }
};

//43rd Api Add Comment in Group by Group Member(LEFT)
exports.addGroupComment = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id.trim():'';
  var group_id = (req.body.group_id)?req.body.group_id.trim():'';
  var comment = (req.body.comment)?req.body.comment.trim():'';
  var timezone = (req.body.timezone)?req.body.timezone.trim():'+00:00';

  if(user_id!=='' && group_id!=='' && comment!==''){

    //Get Group Data
    Group.find({$and:[
      {_id:group_id},
      {deleted:0}  //Changes In migration
    ]}).exec(function(err,groupData){
      if(err){
        return res.sendStatus(400); 
      }

      if(groupData.length > 0){

        //Get Group Data
        Group.findOne({$and:[
            {_id:group_id},
            {createdBy:user_id}
          ]},function(err,groupData1){
            if(err){
              return res.sendStatus(400);
            }

            //Get Group Member Data
            GroupMember.find({$and:[
              {groupId:group_id},
              {$and:[
                  {$or:[{fromUserId:user_id},{toUserId:user_id}]},
                  {status:1} //Changes in migration
              ]}
              ]}).populate('groupId').exec(function(err,groupMemberData){
                if(err){
                  return res.sendStatus(400);
                }

                if(groupMemberData || groupData1)
                {
                  var newGroupComment = new GroupComment();
                  newGroupComment.groupId = group_id;
                  newGroupComment.comments = comment;
                  newGroupComment.createdBy = user_id;
                  newGroupComment.createdAt = moment().format('YYYY-MM-DD HH:mm:ss');
                  newGroupComment.save(function(err,insertGroupComment){
                    if(err){
                      return res.sendStatus(400);
                    }
                    if(insertGroupComment){
                      //Get GroupComment Data
                      GroupComment.findOne({$and:[
                          {deleted:0},{groupId:group_id},{_id:insertGroupComment._id}  //Changes due to migration
                        ]})
                        .populate('groupId')
                        .populate('createdBy')
                        .exec(function(err,GroupCommentData){
                          if(err){
                            return res.sendStatus(400);
                          }

                          var data = [];
                          var Photo = (GroupCommentData.createdBy.photo)?GroupCommentData.createdBy.photo:config.baseUrl.url+'public/uploads/files/user/nouser.jpg';
                          var created_at = moment(GroupCommentData.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD HH:mm:ss');

                          data.push({
                            'comment_id':GroupCommentData._id.toString(),
                            'comments':GroupCommentData.comments,
                            'created_at':created_at,
                            'UserName':GroupCommentData.createdBy.userName,
                            'photo':Photo
                          });
                          //PuSH NOTIFICATION CODE
                          User.findOne({_id:user_id},function(err,userData){                            
                            if(userData)
                            {
                              var fromname = userData.userName;
                              var group_name = groupData[0].groupName;
                              var getGroupMembers = [];
                              general.getGroupMemberList(user_id,group_id,timezone,function(groupMemberList){
                                getGroupMembers.push(groupMemberList);
                                if(getGroupMembers[0].GroupMemberList.length > 0){
                                    var groupMemberUsers = getGroupMembers[0].GroupMemberList;
                                    groupMemberUsers.forEach(function(user){
                                       var device_type = user.device_type;
                                       if(user.token && user.token!='' && user.UserId && user.UserId!= user_id){
                                          var type = '';
                                          var fromName = fromname.charAt(0).toUpperCase() + fromname.substr(1);
                                          var message = fromName+' commented in '+fromName+' group';
                                          var token = user.token;
                                          if(device_type == 'IPHONE'){
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
                                            //note.badge = 3;
                                            note.sound = "default";
                                            note.alert =  message;
                                            note.payload = {'type':4,'group_id':group_id};                                            
                                            
                                            apnConnection.pushNotification(note, myDevice);
                                            console.log(note);

                                          }else{
                                            var regTokens = [];
                                            regTokens.push(token);
                                            console.log('Registered Tokens'+regTokens);
                                            // initialize new androidGcm object 
                                            var gcmObject = new gcm.AndroidGcm('AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc');
                                             
                                            // create new message 
                                            var message = new gcm.Message({
                                                registration_ids: regTokens,
                                                data: {
                                                  "message" : {"message":message,"type":4,"group_id":group_id}
                                                }
                                            });

                                            gcmObject.send(message, function(err, response) {
                                              if(err) console.error(err);
                                                else    console.log(response);
                                            });
                                          }
                                       }
                                    });
                                }
                              }); //End Of all GroupMembers
                            }
                          });
                          //END PuSH NOTIFICATION CODE
                         
                          res.status(200).json({
                            'GroupCommentId':data[0].comment_id,
                            'Comment':data[0].comments,
                            'created_date':data[0].created_at,
                            'UserName':data[0].UserName,
                            'photo':data[0].photo,
                            'message':Cmessage.addgroupcomment.ADDED_COMMENT,
                            'GroupCommentAddAck':Cmessage.condition.TRUE
                          });

                        });
                        //End Get GroupComment Data


                    }else{
                      res.status(200).json({
                        message:Cmessage.addgroupcomment.FAILED_ADD_COMMENT,
                        GroupCommentAddAck:Cmessage.condition.FALSE
                      });
                    }
                  });
                }

              });
          });   
          //End Get Group Data   

      }else{
        res.status(200).json({
          message:Cmessage.addgroupcomment.GROUP_NOT_FOUND,
          GroupCommentAddAck:Cmessage.condition.FALSE
        });
      }
    });
    //End Get Group Data

  }else{
    if(user_id == ''){
      res.status(200).json({
        message:Cmessage.addgroupcomment.USER_NOT_LOGIN,
        GroupCommentAddAck:Cmessage.condition.FALSE
      });
    }else{
      res.status(200).json({
        message:Cmessage.addgroupcomment.REQUIRED_FIELDS,
        GroupCommentAddAck:Cmessage.condition.FALSE
      });
    }
  }
};

//44th Api List of comments
exports.groupCommentList = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id.trim():'';
  var group_id = (req.body.group_id)?req.body.group_id.trim():'';
  var comment_id = (req.body.comment_id)?req.body.comment_id.trim():'';
  var swaping = (req.body.swaping)?req.body.swaping.trim():'OLD';
  var count_start = (req.body.count)?req.body.count.trim():20;
  count_start = parseInt(count_start);
  var timezone = (req.body.timezone)?req.body.timezone.trim():'+00:00';
  var start = 0;
  
  if(user_id !== '' && group_id!==''){
    //Get TotalComment
    GroupComment.find({
      $and:[{deleted:0},{groupId:group_id}]  //Changes Due to migration
    })
    .count()
    .exec(function(err,groupCommentData){
      if(err){
        return res.sendStatus(400);
      }
      console.log(groupCommentData);
      var count_comments = groupCommentData;

      if(comment_id!== '' && swaping!==''){
        if(swaping == 'OLD' || swaping == 'NEW'){
          var condition = [];
          if(swaping == 'OLD'){
            condition.push({"_id":{$lt:comment_id}});
          }else{
            condition.push({"_id":{$gte:comment_id}});
          }
          condition.push({deleted:0});
          condition.push({groupId:group_id});


          // Get Group Comment
          GroupComment.find({
            $and:condition
          })
          .populate('groupId')
          .populate('createdBy')
          .sort({createdBy:-1})
          .limit(count_start)
          .exec(function(err,commentData){
            if(err){              
              return res.sendStatus(400);
            }

            if(commentData){
              var simpleData = [];
              commentData.forEach(function(Comment){
                 var created_date = moment(Comment.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD HH:mm:ss');
                 var Photo = (Comment.createdBy.photo)?Comment.createdBy.photo:config.baseUrl.url+'public/uploads/files/user/nouser.jpg';
                  simpleData.push({
                    'comment_id':Comment._id.toString(),
                    'comments':Comment.comments,
                    'UserName':Comment.createdBy.userName,
                    'UserId':Comment.createdBy._id.toString(),
                    'photo':Photo,
                    'created_date':created_date
                  });
              });

              if(simpleData && simpleData.length>0){

                simpleData = simpleData.sort(function(a, b) {
                  var sortResult = new Date(b.created_date) - new Date(a.created_date);
                  if (sortResult == 0) {
                    return b.comment_id - a.comment_id;
                  }
                  return sortResult;              
                });
                
                res.status(200).json({
                    TotalComment:count_comments.toString(),
                    GroupCommentList:simpleData,
                    message:Cmessage.groupcommentlist.GROUP_COMMENTS_LIST,
                    GroupCommentListAck:Cmessage.condition.TRUE
                });
              }else{
                res.status(200).json({
                  message:Cmessage.groupcommentlist.GROUP_COMMENT_NOT_FOUND,
                  GroupCommentListAck:Cmessage.condition.FALSE
                });
              }
            }
          });
          // End Get Group Comment


        }else{
          res.status(200).json({
            message:Cmessage.groupcommentlist.SWAPPING_NOT_MATCH,
            GroupCommentListAck:Cmessage.condition.FALSE
          }); 
        }
      }else{
        // Get Group Comment
        GroupComment.find({
          $and:[{deleted:0},{groupId:group_id}]
        })
        .populate('groupId')
        .populate('createdBy')
        .limit(count_start)
        .exec(function(err,commentData){
          if(err){            
            return res.sendStatus(400);
          }

          if(commentData){
            var simpleData = [];
            commentData.forEach(function(Comment){
               var created_date = moment(Comment.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD HH:mm:ss');
               var Photo = (Comment.createdBy.photo)?Comment.createdBy.photo:config.baseUrl.url+'public/uploads/files/user/nouser.jpg';
                simpleData.push({
                  'comment_id':Comment._id.toString(),
                  'comments':Comment.comments,
                  'UserName':Comment.createdBy.userName,
                  'UserId':Comment.createdBy._id.toString(),
                  'photo':Photo,
                  'created_date':created_date
                });
            });

            if(simpleData && simpleData.length>0){
              simpleData = simpleData.sort(function(a, b) {
                var sortResult = new Date(b.created_date) - new Date(a.created_date);
                if (sortResult == 0) {
                  return b.comment_id - a.comment_id;
                }
                return sortResult;              
              });
              res.status(200).json({
                  TotalComment:count_comments.toString(),
                  GroupCommentList:simpleData,
                  message:Cmessage.groupcommentlist.GROUP_COMMENTS_LIST,
                  GroupCommentListAck:Cmessage.condition.TRUE
              });
            }else{
              res.status(200).json({
                message:Cmessage.groupcommentlist.GROUP_COMMENT_NOT_FOUND,
                GroupCommentListAck:Cmessage.condition.FALSE
              });
            }
          }
        });
        // End Get Group Comment
      }

    });
    //End Get TotalComment

  }else{
    if(user_id == ''){
      res.status(200).json({
        message:Cmessage.groupcommentlist.USER_NOT_LOGIN,
        GroupCommentListAck:Cmessage.condition.FALSE
      });
    }else{
      res.status(200).json({
        message:Cmessage.groupcommentlist.REQUIRED_FIELDS,
        GroupCommentListAck:Cmessage.condition.FALSE
      });
    }
  }
};

//45th Api UnMember from the Group
exports.unmemberFromGroup = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id:'';
  var to_user_id = (req.body.to_user_id)?req.body.to_user_id:'';
  var group_id = (req.body.group_id)?req.body.group_id:'';
  
  if(user_id!== '' && group_id!==''){
    //Get Group Data
    Group.find({$and:[{deleted:0},{_id:group_id}]}).count().exec(function(err,groupCount){
      if(err){
        return res.sendStatus(400);
      }
      if(groupCount){
        //Check Valid User
        general.checkUserValid(user_id,function(userCount){
          var UserCnt = userCount;
          if(UserCnt == 0){
            res.status(200).json({
              message:Cmessage.unmemberfromgroup.USER_INVAID,
              UserValidAck:Cmessage.condition.FALSE
            });
          }
        });
        //End Check Valid User

        if(to_user_id && to_user_id!==''){
          var invite_user = to_user_id.split(',');
          var grop_owner_user_id = user_id;
        }else{
          var invite_user = user_id.split(',');
        }

        var count = 0;
        // invite_user forEach
        async.forEachSeries(invite_user,function(user,callback){
          if(user && user != '')
          {

            if(grop_owner_user_id && grop_owner_user_id!== ''){                   

              GroupMember.find({$and:[
                      {groupId:group_id},
                      {status:1},
                      {$or:[
                          {fromUserId:user},
                          {toUserId:user}
                      ]}
                    ]})
                    .populate('groupId')
                    .exec(function(err,groupMemberData){

                      var data = [];
                      groupMemberData.forEach(function(groupMember){
                          if(groupMember.groupId.createdBy == grop_owner_user_id){        
                                data.push({'created_by':groupMember.groupId.createdBy,
                                      'to_user_id':groupMember.toUserId,
                                      'from_user_id':groupMember.toUserId,
                                      'groupId':groupMember.groupId._id,
                                      'status':groupMember.status,
                                      'created_at':groupMember.createdAt
                                });
                          }                        
                      });
                      if(data && data.length > 0){
                          GroupMember.remove({$and:[
                              {status:"1"},
                              {groupId:group_id},
                              {$or:[{fromUserId:user},{toUserId:user}]}
                            ]}).exec(function(err,removeGroupMember){
                                if(err){
                                  console.log(err);
                                }
                          }); //End Remove Data
                            count++;
                            callback();
                      }else{
                        callback();
                      }      
                    });//End GroupMember Data  
            }else{

              GroupMember.find({$and:[
                  {groupId:group_id},
                  {status:1},
                  {$or:[
                      {fromUserId:user},
                      {toUserId:user}
                  ]}
                ]})
                .populate('groupId')
                .exec(function(err,groupMemberData){
                  var data = [];
                  groupMemberData.forEach(function(groupMember){
                    data.push({'created_by':groupMember.groupId.createdBy,
                                  'to_user_id':groupMember.toUserId,
                                  'from_user_id':groupMember.toUserId,
                                  'groupId':groupMember.groupId._id,
                                  'status':groupMember.status,
                                  'created_at':groupMember.createdAt
                            });
                 
                  });                

                  if(data && data.length > 0){
                    GroupMember.remove({$and:[
                        {status:"1"},
                        {groupId:group_id},
                        {$or:[{fromUserId:user},{toUserId:user}]}
                      ]}).exec(function(err,removeGroupMember){
                          if(err){
                            console.log(err)
                          }
                    }); //End Remove Member data
                      count++;
                      callback();
                  }else{
                    callback();
                  }
                  
                }); //End GroupMember Data
            }                  
            
          }          
        },function(err){
          //console.log(result);
          if(count > 0){
            res.status(200).json({
              message:Cmessage.unmemberfromgroup.LEFT_FROM_GROUP,
              GroupUnMemberAck:Cmessage.condition.TRUE
            });
          }else{
            res.status(200).json({
              message:Cmessage.unmemberfromgroup.NOT_MEMBER_OF_GROUP,
              GroupUnMemberAck:Cmessage.condition.TRUE
            });
          }  
        });
        // End invite_user forEach
      }else{
        res.status(200).json({
          message:Cmessage.unmemberfromgroup.GROUP_NOT_FOUND,
          GroupUnMemberAck:Cmessage.condition.FALSE
        });
      }
    });
    //End Get Group Data
  }else{
    if(user_id == ''){
        res.status(200).json({
          message:Cmessage.unmemberfromgroup.USER_NOT_LOGIN,
          GroupUnMemberAck:Cmessage.condition.FALSE
        });
    }else{
      res.status(200).json({
          message:Cmessage.unmemberfromgroup.REQUIRED_FIELDS,
          GroupUnMemberAck:Cmessage.condition.FALSE
      });
    }
  }
};

//46th Api Delete Group
exports.deleteGroup = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id:'';
  var group_id = (req.body.group_id)?req.body.group_id:'';
  if(user_id!=='' && group_id!==''){
    //Get Group Data
    Group.findOne({$and:[
          {_id:group_id},
          {deleted:0},
          {createdBy:user_id}
      ]},function(err,groupData){
        if(err){
          return res.sendStatus(400);
        }
        if(groupData){

          if(groupData.awsImageUrl!== ''){
            awsSdk.deleteAWSFile(groupData.groupImage,2);
          }            

          Group.remove({$and:[{_id:group_id},{createdBy:user_id}]},function(err,remgroupData){
          });
          GroupMember.remove({groupId:group_id},function(err,remgroupMemberData){
          });
          GroupComment.remove({groupId:group_id},function(err,remgroupCommentData){
          });      

          res.status(200).json({
            message:Cmessage.deletegroup.GROUP_DELETED,
            GroupDeleteAck:Cmessage.condition.TRUE
          });     
        }else{
          res.status(200).json({
            message:Cmessage.deletegroup.GROUP_NOT_FOUND,
            GroupDeleteAck:Cmessage.condition.FALSE
          });
        }
      }); //End Group Data
  }else{
    if(user_id == ''){
        res.status(200).json({
          message:Cmessage.deletegroup.USER_NOT_LOGIN,
          GroupDeleteAck:Cmessage.condition.FALSE
        });
    }else{
      res.status(200).json({
        message:Cmessage.deletegroup.REQUIRED_FIELDS,
        GroupDeleteAck:Cmessage.condition.FALSE
      });
    }
  }
};

//47. Delete Group Comment
exports.deleteComment = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id.trim():'';
  var group_id = (req.body.group_id)?req.body.group_id.trim():'';
  var comment_id = (req.body.comment_id)?req.body.comment_id.trim():'';

  if(user_id!=='' && group_id!=='' && comment_id!==''){
    Group.findOne({$and:[
                    {deleted:0},
                    {_id:group_id}
                  ]},function(err,groupData){
                    if(err){
                      return res.sendStatus(400);
                    }
                    if(groupData){
                      GroupComment.findOne({$and:
                              [                            
                                  {_id:comment_id},
                                  {deleted:0}
                              ]}).populate('groupId').populate('createdBy').exec(function(err,groupCommentData){

                        if(err){
                          return res.sendStatus(400);
                        }
                        if(groupCommentData.groupId._id == group_id || groupCommentData.createBy == user_id || groupData.createdBy == user_id){
                          GroupComment.remove({_id:comment_id},function(err,remgroupComment){
                            if(err){
                              return res.sendStatus(400);
                            }
                            if(remgroupComment){
                              res.status(200).json({
                                message:Cmessage.deletecomment.DELETE_COMMENT,
                                GroupCommentDeleteAck:Cmessage.condition.TRUE
                              });
                            }else{
                              res.status(200).json({
                                message:Cmessage.deletecomment.COMMENT_NOT_FOUND,
                                GroupCommentDeleteAck:Cmessage.condition.TRUE
                              });
                            }
                          }); //End Of Remove Comment
                        }
                      }); //End of Group Comment Data
                    }else{
                      res.status(200).json({
                        message:Cmessage.deletecomment.GROUP_NOT_FOUND,
                        GroupCommentDeleteAck:Cmessage.condition.FALSE
                      });
                    }
                  }); //End Of Group Data
  }else{
    if(user_id == ''){
        res.status(200).json({
          message:Cmessage.deleteComment.USER_NOT_LOGIN,
          GroupDeleteAck:Cmessage.condition.FALSE
        });
    }else{
      res.status(200).json({
          message:Cmessage.deleteComment.REQUIRED_FIELDS,
          GroupDeleteAck:Cmessage.condition.FALSE
      });
    }
  }

};

//Add Group Multiple Comment Api
exports.addGroupMultipleComment = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id:'';
  var group_id = (req.body.group_id)?req.body.group_id:'';
  var comment = (req.body.comment)?req.body.comment:'';
  var timezone = (req.body.timezone)?req.body.timezone:'';

  if(user_id!='' && group_id!='' && comment!=''){
    var group_id_array = group_id.split(",");
      if(group_id_array && group_id_array.length > 0){
        var groupData = [];
        async.each(group_id_array,function(group_id_one,asyncCallback){
            //group_id_array.indexOf(group_id_one);
            if(group_id_one != '')
            {
            console.log('For Each'+group_id_one);
            var newGroupComment = new GroupComment();
            newGroupComment.groupId = group_id_one;
            newGroupComment.comments = comment;
            newGroupComment.createdBy = user_id;
            newGroupComment.createdAt = moment().format('YYYY-MM-DD HH:mm:ss');
            newGroupComment.save(function(err,addGroupComment){
              if(err){
                console.log(err);
              }
              if(addGroupComment){
                 var groupComentId = addGroupComment._id
                GroupComment.findOne({$and:[{_id:groupComentId},{groupId:group_id_one},{deleted:0}]}).populate('createdBy').exec(function(err,groupCommentData){
                  if(err){
                    console.log(err);
                  }
                  if(groupCommentData){
                    var data = {
                      'comment_id':groupCommentData._id,
                      'comments':groupCommentData.comments,
                      'created_at': moment(groupCommentData.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD HH:mm:ss'),
                      'UserName':groupCommentData.userName,
                      'photo':(groupCommentData.createdBy.photo)?groupCommentData.createdBy.photo:config.baseUrl.url+'public/uploads/files/user/nouser.jpg'
                    };
                  }
                  //get Username
                 
                  general.getUserName(user_id,function(username){  
                      var fromname = username;
                  //Get Groupname
                    general.getGroupName(group_id_one,function(groupname){
                        var group_name = groupname;
                        var getGroupMembers = [];
                      general.getGroupMemberList(user_id,group_id_one,timezone,function(groupMemberList){
                            getGroupMembers.push(groupMemberList);
                              if(getGroupMembers[0].GroupMemberList.length > 0){
                                  var groupMemberUsers = getGroupMembers[0].GroupMemberList;
                                  groupMemberUsers.forEach(function(user){
                                     var device_type = user.device_type;
                                     if(user.token && user.token!='' && user.UserId && user.UserId!= user_id){
                                        var type = '';
                                        var fromName = fromname.charAt(0).toUpperCase() + fromname.substr(1);
                                        var message = fromName+' commented in '+group_name+' group';
                                        var token = user.token;
                                        if(device_type == 'IPHONE'){
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
                                            //note.badge = 3;
                                            note.sound = "default";
                                            note.alert =  message;
                                            note.payload = {'type':4,'group_id':group_id};                                            
                                            
                                            apnConnection.pushNotification(note, myDevice);
                                            console.log(note);
                                        }else{
                                          
                                          var regTokens = [];
                                          regTokens.push(token);
                                          console.log('Registered Tokens'+regTokens);
                                          // initialize new androidGcm object 
                                          var gcmObject = new gcm.AndroidGcm('AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc');
                                           
                                          // create new message 
                                          var message = new gcm.Message({
                                              registration_ids: regTokens,
                                              data: {
                                                "message" : {"message":message,"type":4,"group_id":group_id}
                                              }
                                          });

                                          gcmObject.send(message, function(err, response) {
                                            if(err) console.error(err);
                                              else    console.log(response);
                                          });
                                        }
                                     }
                                  });
                                }
                        }); //End Of all GroupMember
                    });   
                  });//End Of Username
                
                groupData.push({
                    'GroupCommentId':data.comment_id,
                    'Comment':data.comments,
                    'created_date':data.created_at,
                    'UserName':data.UserName,
                    'photo':data.photo
                });

                  asyncCallback();
                }); //End Find Of Group Comment Data
              }
            });//End Of insert Group comment
            }
          
        },function(err){
          //Response Of Api
          if(!err){
            res.status(200).json({
                data:groupData,
                message:'You have successfully added comment',
                GroupCommentAddAck:Cmessage.condition.TRUE
            });
          }
        }); //For Every group that are inserted
      }
  }else{
    if(user_id == ''){
        res.status(200).json({
          message:Cmessage.addgroupmultiplecomment.USER_NOT_LOGIN,
          GroupDeleteAck:Cmessage.condition.FALSE
        });
    }else{
      res.status(200).json({
        message:Cmessage.addgroupmultiplecomment.REQUIRED_FIELDS,
        GroupDeleteAck:Cmessage.condition.FALSE
      });
    }
  }
};

//51st Api Group Member List
exports.groupMemberList = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id.trim():'';
  var group_id = (req.body.group_id)?req.body.group_id.trim():'';
  var timezone = (req.body.timezone)?req.body.timezone.trim():'+00:00';
  if(user_id!=='' && group_id!== ''){
    //Get Group Data 
    Group.findOne({_id:group_id})
        .populate('createdBy')
        .exec(function(err,groupData){
          if(err){
            return res.sendStatus(400);
          }
          if(groupData){
            GroupMember.find({
              $and:[{groupId:groupData._id},{status:1}]
            },function(err,groupMemberData){
              if(err){
                return res.sendStatus(400);
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

                //Group Data
                var groupImage = (groupData.awsImageUrl)?groupData.awsImageUrl:groupData.groupImage;
                var group_create_time = moment(groupData.createdAt).tz('+00:00',timezone).format('YYYY-MM-DD');
                var group_name = groupData.groupName;
                var group_owner = groupData.createdBy.userName;
                var group_owner_user_id = groupData.createdBy._id;

                if(memberId && memberId.length == 0)
                {
                  memberId.push(group_owner_user_id);  
                }

                //Get Group Member User
                User.find({_id: { $in: memberId}}).exec(function(err,userData){
                  if(err){
                    console.log(err);
                  }
                  if(userData)
                  {
                    var groupMemberUser = [];
                    userData.forEach(function(user){
                      var Photo = (user.photo)?user.photo:config.baseUrl.url+'public/uploads/files/server/nouser.jpg';
                      groupMemberUser.push({
                        'Photo':Photo,
                        'UserName':user.userName,
                        'UserId':user._id.toString()
                      });                                          
                    });

                    var userFriendList = [];
                    var finalcount = 0;
                    //Get Request Data
                    Request.find({
                      $and:[{status:"accepted"},{requestToId:user_id}]
                    })
                    .populate('requestFromId')
                    .exec(function(err,requestData){
                      if(err){
                        return res.sendStatus(400);
                      }

                      if(requestData){
                        async.each(requestData,function(requestUser,asyncCallback){
                           var request_from_id = requestUser.requestFromId._id;
                          //Get GroupMember Data
                          GroupMember.findOne({$and:[
                              {groupId:group_id},
                              {$or:[
                                {fromUserId:request_from_id},
                                {toUserId:request_from_id}
                              ]}
                            ]}).populate('groupId').exec(function(err,groupMemberId){

                                if(groupMemberId)
                                {
                                  if(groupMemberId.groupId._id){
                                    var is_your_group_member = (groupMemberId.status == '1')?'1':'0';
                                  }else{
                                    var is_your_group_member = '2';
                                  }  
                                }else{
                                  var is_your_group_member = '2';
                                }
                                
                                var Photo = requestUser.requestFromId.photo?requestUser.requestFromId.photo:'';
                                userFriendList.push({
                                  'Id':requestUser.requestFromId._id.toString(),
                                  'Email':requestUser.requestFromId.email,
                                  'Phone':requestUser.requestFromId.phone,
                                  'DOB':requestUser.requestFromId.birthDate,
                                  'UserName':requestUser.requestFromId.userName,
                                  'Photo':Photo,
                                  'RegisteredDate':requestUser.requestFromId.createdDate,
                                  'Status':requestUser.status,
                                  'is_your_group_member':is_your_group_member
                                });
                                asyncCallback();
                          }); //End GroupMember Data

                        },function(err){
                          if((groupMemberUser && groupMemberUser.length>0) || (userFriendList && userFriendList.length>0)){
                        
                              var blankArray = [];
                              var finaldata_group_name = (group_name)?group_name:'';
                              var finaldata_group_image = (groupImage)?groupImage:'';
                              var finaldata_group_owner = (group_owner)?group_owner:'';
                              var finaldata_group_create_time = (group_create_time)?group_create_time:'';
                              var finaldata_group_members_list = (groupMemberUser)?groupMemberUser:blankArray;
                              var finaldata_user_friend_list = (userFriendList)?userFriendList:blankArray;
                              var finaldata_user_friend_count = (userFriendList.length>0)?userFriendList.length:'';                            

                              res.status(200).json({
                                GroupName:finaldata_group_name,
                                GroupImage:finaldata_group_image,
                                GroupOwner: finaldata_group_owner,
                                GroupCreateTime:finaldata_group_create_time,
                                GroupMemberList:finaldata_group_members_list,
                                UserFriendList:finaldata_user_friend_list,
                                UserFriendCount:finaldata_user_friend_count,
                                message:Cmessage.groupmemberlist.GROUP_MEMBER_LIST,
                                GroupMemberListAck:Cmessage.condition.TRUE
                              });

                          }else{
                            res.status(200).json({
                              message:Cmessage.groupmemberlist.GROUP_MEMBER_NOT_FOUND,
                              GroupMemberListAck:Cmessage.condition.FALSE
                            });
                          }
                        });
                      
                      }

                    });
                  }
                });
                //End Get Group Member User

              }
            });
          }    
        });
  }else{
    res.status(200).json({
      message:Cmessage.groupmemberlist.USER_NOT_LOGIN,
      GroupMemberListAck:Cmessage.condition.FALSE
    });
  }
};

exports.updateGroupComment = function(req,res){
     GroupComment.find()
     .exec(function(error,suggestionComment){       
       var updatedDate = [];
       suggestionComment.forEach(function(suggestion){
          
          if(suggestion.createdAt)
          {
            var datetime = moment(suggestion.createdAt).format('YYYY-MM-DD HH:mm:ss');
            //suggestion.createdDate = datetime;
            //suggestion.lastAlertviewed = datetime;
            //suggestion.save();
            updatedDate.push({date:datetime});
          }
       });
       
      res.status(200).json({
        UpdateDate: updatedDate
      });

     });
};