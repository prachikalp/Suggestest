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


//5th Api registration
exports.registration = function(req,res){

//All the parameters req are defined in variable

    var id = req.body.id;
    var IsNew = req.body.IsNew;
    var UserName = req.body.UserName;
    UserName = UserName.toLowerCase();
    var Phone = req.body.Phone;
    var Email = req.body.Email;
    var Countrycode = req.body.Countrycode;
    var Password = req.body.Password;
    var Dob = req.body.Dob;
    var token = req.body.token;
    var Photo = req.files.Photo;
    var device_type = req.body.device_type;
    var onlyValidation = req.body.onlyValidation;
    
  // at least six characters
  var re = /(?=.*[a-z])/;

  //Condition for isNew = true  
  if(IsNew === "true"){
    //Required fileds are not found
    if(Email && Phone && UserName && Password && Countrycode){
      //Conditions for valid userName as per pattern
      if(UserName && re.test(UserName)){
        User.findOne({ $or:[ {userName:UserName},{email: Email},{phone: Phone}]},function(err,userData){
          if(err){
            return res.sendStatus(400);
          }
          if(userData){
            //Condition if UserName or Email or Phone exists than shows the failure message
            if(userData.userName === UserName){
              res.status(200).json({
                  message:Cmessage.user.ALREADY_EXISTS,
                  UserSignInAck:Cmessage.condition.FALSE
              });
            }else{
              if(userData.phone === Phone && userData.email === Email){
                res.status(200).json({
                  message:Cmessage.user.ALREADY_WITH_PHONE_AND_EMAIL,
                  UserSignInAck:Cmessage.condition.FALSE
                });
              }else{
                if(userData.email === Email){
                    res.status(200).json({
                      message:Cmessage.user.EMAIL_EXISTS,
                      UserSignInAck:Cmessage.condition.FALSE
                    });
                }else{
                    res.status(200).json({
                      message:Cmessage.user.CONTACT_EXISTS,
                      UserSignInAck:Cmessage.condition.FALSE
                    });
                }
              }
            }
          }//End of userData
          else{   //If User is Not Found then insert the data
            if (onlyValidation) {
                  res.status(200).json({
                      message:Cmessage.user.AUTH,
                      UserSignInAck:Cmessage.condition.TRUE
                  });
            } else {
              var newUser = new User();
              newUser.email = Email;
              newUser.phone = Phone;
              newUser.birthDate = Dob;
              newUser.userName = UserName;
              //Password to be encode with base64
              var utfpassword = utf8.encode(Password);
              var encpassword = base64.encode(utfpassword);
              newUser.userPassword = encpassword;
              newUser.isActive = "0";
              newUser.token = token;
              newUser.countryCode = Countrycode;
              newUser.photo = "";
              newUser.fbLogin =""; 
              newUser.deviceType = device_type;
              
              newUser.save(function(err,newinsertUser){
                if(err){
                    return res.sendStatus(400);
                }
  
                //Read the html template file
                var filePath = path.join(__dirname, '../helpers/mailTemplate/registrationmail.html');
  
                fs.readFile(filePath,'utf8',function (err, html){       
                html = html.replace("{{UserName}}",UserName);
                html = html.replace("{{UserName1}}",UserName);
                html = html.replace("{{Phone}}",Phone);
                //Sendgrid Mail Done
                var sendEmail = new sendgrid.Email();
  
                      
                  sendEmail.setTos(Email);
                  sendEmail.setFrom(config.sendgrid.from);
                  sendEmail.setSubject(config.sendgrid.subject1);
                  sendEmail.setHtml(html); //added template html file
                  
                  sendgrid.send(sendEmail, function(err, json){ 
                    if(err){
                      console.log(err);
                      res.sendStatus(400);
                    }else{
                      res.status(200).json({
                        UserId: newinsertUser._id,
                        message:Cmessage.user.REGISTERED_SUCCESFULLY,
                        UserSignInAck:Cmessage.condition.TRUE
                      });
                    }
                  });
                });  
              });
            }
          }
        });
      }else{
        res.status(200).json({
          message:Cmessage.user.USERNAME_INVALID,
          UserSignInAck:Cmessage.condition.FALSE
        });
      }
    }else{
      res.status(200).json({
        message:Cmessage.user.REQUIRED_FIELDS,
        UserSignInAck:Cmessage.condition.FALSE
      });
    } 
  }else{
    //Condition for isNew = false
      //Required fileds are not found
      if(id && id!=='' &&  UserName!=='' && Phone!==''){
        //Conditions for valid userName as per pattern
        if(UserName && re.test(UserName)){
          User.findOne({$and:[
            {_id: {$ne:{id}}},
            {$or:[
              {phone:Phone},
              {userName:UserName},
              {email:Email}
              ]
            }]},function(err,userData){
              //If user exists with the userId
              
              if(userData){
                if(userData.userName === UserName){
                  res.status(200).json({
                    message:Cmessage.user.ALREADY_EXISTS,
                    UserUpdateAck:Cmessage.condition.FALSE
                  });
                }else{
                  if(userData.phone === Phone && userData.email === Email){
                    res.status(200).json({
                      message:Cmessage.user.ALREADY_WITH_PHONE_AND_EMAIL,
                      UserSignInAck:Cmessage.condition.FALSE
                    });
                  }else{
                    if(userData.email === Email){
                        res.status(200).json({
                          message:Cmessage.user.EMAIL_EXISTS,
                          UserSignInAck:Cmessage.condition.FALSE
                        });
                    }else{
                        res.status(200).json({
                          message:Cmessage.user.CONTACT_EXISTS,
                          UserSignInAck:Cmessage.condition.FALSE
                        });
                    }
                  }
                }
              }else{   //For photo upload code
                var aws_file_url = '';

                if(Photo){
                  var photoname = Photo.originalname;
                  var photopath = Photo.path;

                  if(fs.existsSync(photopath)){
                    aws_file_url = awsSdk.uploadeUserPhoto(photopath); 
                    //Remove Local File
                    fs.unlink(photopath);                    
                  }
                }                

                User.findOne({_id:id},function(err,updateUserData){
                  if(err){
                    return res.sendStatus(400);
                  }
                  if(updateUserData){
                    console.log(updateUserData);
                    if(Email){
                      updateUserData.email = Email;
                    }
                    if(Phone){
                       updateUserData.phone = Phone;
                    }
                    if(Photo){
                      updateUserData.photo = aws_file_url;
                    }
                    if(Countrycode){
                       updateUserData.countryCode = Countrycode;
                    }
                    if(Dob){
                      updateUserData.birthDate = Dob;
                    }
                    if(UserName){
                        updateUserData.userName = UserName;
                    }
                    if(Password){
                      //Password to be encode with base64
                      var utfpassword = utf8.encode(Password);
                      var encpassword = base64.encode(utfpassword);
                      updateUserData.userPassword = encpassword;
                    }
                    if(token){
                       updateUserData.token = token;
                    }
                    
                    updateUserData.updatedDate = new Date();
                    updateUserData.save();
                      res.status(200).json({
                          Photo: aws_file_url,
                          message:Cmessage.user.PROFILE_UPDATED,
                          UserUpdateAck:Cmessage.condition.TRUE
                      });
                  }
                });                    
                
              } //If username is not found then update user
          });
        }else{
          res.status(200).json({
            message:Cmessage.user.USERNAME_INVALID,
            UserSignInAck:Cmessage.condition.FALSE
          });
        }
      }else{
        res.status(200).json({
          message:Cmessage.user.ENTER_PARAMETER,
          UserSignInAck:Cmessage.condition.FALSE
        });
      }
    }//End Of IsNew Condition False
};


//2nd Api login
exports.login = function(req,res){

  var UserName = req.body.UserName;
  UserName = UserName.toLowerCase();
  var Password = req.body.Password;
  var isFB = req.body.isFB;
  var FbId = req.body.FbId;
  var Email = req.body.Email;
  var Phone = (req.body.Phone) ? req.body.Phone : '';
  var Countrycode = (req.body.Countrycode) ? req.body.Countrycode : '';
  var BirthDate = (req.body.BirthDate) ? req.body.BirthDate : '';
  var token = (req.body.token) ? req.body.token : '';
  var device_type = req.body.device_type;
  var onlyValidation = req.body.onlyValidation;

  // at least six characters
  var re = /(?=.*[a-z])/;

//isFb = true condition
  if(FbId && isFB === "true"){
    //Reguired fields are necesaary
    if(Phone && Email && UserName && Countrycode){
      User.findOne( { $or:[{userName:UserName},{email: Email},{phone: Phone}]},function(err,userData){
        if(err){
          return res.sendStatus(400);
        } 
        //Data is found if UserName,Phone or Email exists
        //UserName ,phone and Email should be same then update fblogin data 
        if(userData){
          if(userData.userName === UserName && userData.phone === Phone && userData.email === Email){
            User.findOne({userName : UserName},function(err,updatefbLoginData){
              if(err){
                return res.sendStatus(400);
              }
             
              //For Specific UserName
              if(updatefbLoginData){
                  updatefbLoginData.token = token;
                  updatefbLoginData.deviceType = device_type;
                  updatefbLoginData.fbLogin = FbId;
                  updatefbLoginData.save();
                  res.status(200).json({
                    UserId:updatefbLoginData._id.toString(),
                    UserName:updatefbLoginData.userName,
                    Email:updatefbLoginData.email,
                    Phone:updatefbLoginData.phone,
                    Countrycode:updatefbLoginData.countryCode,
                    Photo:config.baseUrl.url+'public/uploads/files/user/'+updatefbLoginData.photo,
                    message:Cmessage.user.USER_AUTH_FBID,
                    UserLoginsAck:Cmessage.condition.TRUE
                  });
              }
            });
          }else{
            //Condition if UserName or Email or Phone exists than shows the failure message
            if(userData.userName === UserName){
              res.status(200).json({
                  message:Cmessage.user.ALREADY_EXISTS,
                  UserLoginsAck:Cmessage.condition.FALSE
              });
            }else{
              if(userData.phone === Phone && userData.email === Email){
                res.status(200).json({
                  message:Cmessage.user.ALREADY_WITH_PHONE_AND_EMAIL,
                  UserLoginsAck:Cmessage.condition.FALSE
                });
              }else{
                if(userData.email === Email){
                  res.status(200).json({
                    message:Cmessage.user.EMAIL_EXISTS,
                    UserLoginsAck:Cmessage.condition.FALSE
                  });
                }else{
                  res.status(200).json({
                    message:Cmessage.user.CONTACT_EXISTS,
                    UserLoginsAck:Cmessage.condition.FALSE
                  });
                }
              }
            }
          } 
        }else{    //If User doesn't exists
           //Check UserName Valid or not
          if (onlyValidation) {
            res.status(200).json({
              message:Cmessage.user.AUTH,
              UserLoginsAck:Cmessage.condition.TRUE
            });
          } else {
            var Password = "";

            // Start Generate Password              
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            for( var i=0; i < 8; i++ )
            {
              Password += possible.charAt(Math.floor(Math.random() * possible.length));
            }
              // End Generate Password
            var utfpassword = utf8.encode(Password);
            var encpassword = base64.encode(utfpassword);
            
            if(UserName &&  re.test(UserName)){
            
              var newUser = new User();
              newUser.email = Email;
              newUser.phone = Phone;
              newUser.birthDate = BirthDate;
              newUser.userName = UserName;
              newUser.userPassword = encpassword;
              newUser.fbLogin = FbId;
              newUser.token = token;
              newUser.countryCode = Countrycode;
              newUser.photo = "";
              newUser.deviceType = device_type;
              newUser.save(function(err,insertUserfb){
                if(err){
                  return res.sendStatus(400);
                }
                //Read the html template file
                var filePath = path.join(__dirname, '../helpers/mailTemplate/registrationmail.html');

              fs.readFile(filePath,'utf8',function (err, html){ 

                html = html.replace("{{UserName}}",UserName);
                html = html.replace("{{UserName1}}",UserName);
                html = html.replace("{{Phone}}",Phone);
                //Sendgrid Mail Done
                var sendEmail = new sendgrid.Email();

                  sendEmail.setTos(Email);
                  sendEmail.setFrom(config.sendgrid.from);
                  sendEmail.setSubject(config.sendgrid.subject1);
                  sendEmail.setHtml(html); //added template html file
                 
                  sendgrid.send(sendEmail, function(err, json){ 
                    if(err){
                      console.log(err);
                      res.sendStatus(400);
                    }else{
                      res.status(200).json({
                          UserId:insertUserfb._id.toString(),
                          Email: Email,
                          Phone:Phone,
                          Countrycode:Countrycode,
                          UserName:UserName,
                          Photo: '',
                          isNewUser:'True',
                          message:Cmessage.user.USER_REGISTERD,
                          UserLoginsAck:Cmessage.condition.TRUE
                      });
                    }
                  });
              });

              });
            }else{
              res.status(200).json({
                message:Cmessage.user.USERNAME_INVALID,
                UserLoginsAck:Cmessage.condition.FALSE
              });
            }
          }
        }

      });
    }else{
      res.status(200).json({
        message: Cmessage.parameters.PROPER_VALUE,
        UserLoginsAck:Cmessage.condition.FALSE
      });
    }
  }else{

    //isFb condition is false
    if(UserName && Password && isFB ==='false'){
      User.findOne({userName:UserName},function(err,userData){
        if (err){
          return res.status(500).json(err);
        }
        if (!userData) {
          return res.status(200).json({
             UserId: '',
             isNewUser:'False', 
             message: Cmessage.user.NOT_AUTH,
             UserLoginsAck:Cmessage.condition.FALSE
          });
        }
        //Encode the password with base64  
        var userpassword = userData.userPassword;
        var utfpassword = utf8.encode(Password);
        var encpassword = base64.encode(utfpassword);

        if(encpassword != userpassword) {
          return res.status(200).json({
             UserId: '',
             isNewUser:'False', 
             message: Cmessage.user.NOT_AUTH,
             UserLoginsAck:Cmessage.condition.FALSE
          });
        }

        var sessiontoken = jwt.encode({
            iss: userData.id
        }, config.sessionSecret);

        if(!userData.sessionToken)
        {

            userData.sessionToken = sessiontoken;
            userData.createdDate = new Date();
            userData.updatedDate = new Date();
            userData.save();
        }

        if(userData){         
          //var usertoken =  user.token;
          var isActive = userData.isActive;
          
          if(isActive === '1'){
            res.status(200).json({
              message: Cmessage.user.USER_BLOCKED,
              UserLoginsAck:Cmessage.condition.FALSE
            });
          }else{
            User.findOne({userName:UserName},function(err,updateUserData){
                if(err){
                  return res.sendStatus(400);
                }
                if(updateUserData){

                  if(updateUserData.isForgotPassword)
                  {
                    var isForgotPassword = updateUserData.isForgotPassword;  
                  }else{
                    var isForgotPassword = '0';
                  }
                  

                  if(updateUserData.isForgotPassword == '1')
                  {
                    updateUserData.isForgotPassword = '0';  
                  }

                  updateUserData.token = token;
                  updateUserData.deviceType = device_type;
                  updateUserData.sessionToken = sessiontoken;
                  updateUserData.updatedDate = new Date();
                  updateUserData.save();
                  res.status(200).json({
                    authToken:sessiontoken,
                    UserId:updateUserData._id.toString(),
                    Email:updateUserData.email,
                    Phone:updateUserData.phone,
                    UserName:updateUserData.userName,
                    Countrycode:updateUserData.countryCode,
                    Photo:(updateUserData.photo)?config.baseUrl.url+'public/uploads/files/user/'+updateUserData.photo:'',
                    isNewUser:'false',
                    message:Cmessage.user.AUTH,
                    UserLoginsAck:Cmessage.condition.TRUE,
                    isForgotPassword:isForgotPassword
                  });
                }
              });          
            }
          } 
      });
    }else{
      res.status(200).json({
          message:Cmessage.parameters.PROPER_VALUE,
          UserLoginsAck:Cmessage.condition.FALSE
      }); 
    }
  }
};

//1st Api loginauth

exports.loginAuth = function(req,res){
  var isFB = req.body.isFB;
  var FbId = req.body.FbId;
  var token = req.body.token;
  var devicetype = req.body.device_type;

// If User is a Facebook User
    if(FbId && isFB === "true"){
      User.findOne({fbLogin: FbId},function(err,userFbData){
          if(err){
            return res.sendStatus(400);
          }

          //If User is not a Facebook User
          if(userFbData == null){
            res.status(200).json({
              message:Cmessage.user.USER_NOTAUTH_FBID,
              UserAuthenticateAck:Cmessage.condition.FALSE
            });
          }else{
            //Generate Auth Token from system for login            

            if(userFbData){

              var sessiontoken = jwt.encode({ 
                  iss: userFbData._id
              }, config.sessionSecret);

              if(!userFbData.sessionToken)
              {
                userFbData.sessionToken = sessiontoken;
                userFbData.createdDate = new Date();
                userFbData.updatedDate = new Date();
                userFbData.save();
              }

              if(userFbData.isActive === '1'){
                res.status(200).json({
                  message:Cmessage.user.USER_BLOCKED,
                  UserAuthenticateAck:Cmessage.condition.FALSE
                });
              }else{
               //Authenticate User 
                var usertoken = userFbData.token;
                var updateToken = 0;
                if(token){
                  updateToken = 1;
                }else{
                  if(token!== usertoken){
                    updateToken = 1;
                  }
                }
                //Update User token-start
                if(updateToken === 1){
                  User.findOne({fbLogin:FbId},function(err,updateUserfbData){
                    if(err){
                      return res.sendStatus(400);
                    }
                    if(updateUserfbData){                      
                      updateUserfbData.sessionToken = sessiontoken; 
                      updateUserfbData.token = token;
                      updateUserfbData.deviceType = devicetype;
                      updateUserfbData.save();
                      res.status(200).json({
                        authToken:sessiontoken,
                        UserId:updateUserfbData._id.toString(),
                        UserName:updateUserfbData.userName,
                        Email:updateUserfbData.email,
                        Phone:updateUserfbData.phone,
                        Photo:(updateUserfbData.photo)?updateUserfbData.photo:'',
                        Countrycode:updateUserfbData.countryCode,
                        message:Cmessage.user.USER_AUTH_FBID,
                        UserAuthenticateAck:Cmessage.condition.TRUE
                      });
                    }
                  });
                }
              }
             
            }
          }
                   
      });
   }else{      //If FbId is not there and isFb is false
      res.status(200).json({
          message : Cmessage.parameters.PROPER_VALUE,
          UserAuthenticateAck:Cmessage.condition.FALSE
      });
   }
};

//3rd Api logout 
exports.logout = function(req,res){
  var id = req.body.id;
  if(id){
    User.findOne({_id:id},function(err,userData){
      if(err){
        return res.sendStatus(400);
      }
      if(userData){
        userData.token = '';
        userData.save();
        res.status(200).json({
            message:Cmessage.user.LOGOUT_SUCCESS,
            LoutOutAck:Cmessage.condition.TRUE
        });
      }
    });
  }else{
    res.status(200).json({
        message:Cmessage.parameters.MESSAGE,
        LoutOutAck:Cmessage.condition.FALSE
    }); 
  } 
};

//4th Api changepassword 
exports.changePassword = function(req,res){
  var id = req.body.id;
  var oldpwd = req.body.oldpwd;
  var newpwd = req.body.newpwd;
  if(id && oldpwd && newpwd){
    User.findOne({_id:id},function(err,userData){
      if(err){
        return res.sendStatus(400);
      }
      var utfoldpwd = utf8.encode(oldpwd);
      var encoldpwd = base64.encode(utfoldpwd);
      console.log(oldpwd);
      console.log(encoldpwd+"========"+userData.userPassword);
      var userpassword =  userData.userPassword;

      if(encoldpwd!== userpassword){
        res.status(200).json({
            message:Cmessage.user.OLD_PWD_WRONG,
            UserChangepasswordAck:Cmessage.condition.FALSE
        });
      }
      if(userData){
        if(encoldpwd === userpassword){
            var utfnewpwd = utf8.encode(newpwd);
            var encnewpwd = base64.encode(utfnewpwd);
            userData.userPassword = encnewpwd;
            userData.save();
            res.status(200).json({
                  message: Cmessage.user.PWD_CHANGED,
                  UserChangepasswordAck:Cmessage.condition.TRUE
            });
        }
      }
    });
  }else{
    res.status(200).json({
      message:Cmessage.user.ENTER_PARAMETER,
      UserChangepasswordAck:Cmessage.condition.FALSE
    });
  }
};

//12th Api forgotpassword
exports.forgotPassword = function(req,res){
  var email = req.body.email;
  if(email){
    User.findOne({email:email},function(err,userData){
      if(err){
        return res.sendStatus(400);
      }
      if(userData){

        var password = generatePass();

        var utfpassword = utf8.encode(password);
        var encpassword = base64.encode(utfpassword);

        var uname = userData.userName;

        //var pass = userData.userPassword;

        //Decode the encoded password with base64
        //var decpassword = base64.decode(pass);
        //var password = utf8.decode(decpassword);
        
        //Read the html template file
        var filePath = path.join(__dirname, '../helpers/mailTemplate/forgotpwdmail.html');

        fs.readFile(filePath,'utf8',function (err, html){       
          html = html.replace("{{uname}}",uname);
          html = html.replace("{{password}}",password);
          html = html.replace("{{uname1}}",uname);
              //Sendgrid Mail Done
              var sendEmail = new sendgrid.Email();

              sendEmail.setTos(email);
              sendEmail.setFrom(config.sendgrid.from);
              sendEmail.setSubject(config.sendgrid.subject2);
              sendEmail.setHtml(html); //added template html file
              
              sendgrid.send(sendEmail, function(err, json){ 
                if(err){
                  console.log(err);
                  res.sendStatus(400);
                }else{
                  userData.isForgotPassword = '1';  
                  userData.userPassword = encpassword;
                  userData.save();

                  res.status(200).json({
                    message: Cmessage.user.FORGOT_PWD_SUCCESS,
                    UserForgotPasswordAck:Cmessage.condition.TRUE
                  });
                }
              });
        });         
      }
      if(!userData){
        res.status(200).json({
          message:Cmessage.user.NOT_AUTH,
          UserForgotPasswordAck:Cmessage.condition.FALSE
        });
      }
    });
  }else{
    res.status(200).json({
      message:Cmessage.user.VALID_EMAIL,
      UserForgotPasswordAck:Cmessage.condition.FALSE
    });
  }
};

//50. Update/Add device Token in Users
exports.updateDeviceToken = function(req,res){
  var user_id = (req.body.user_id)?req.body.user_id:'';
  var token = (req.body.token)?req.body.token:'';
  var device_type = (req.body.device_type)?req.body.device_type:'';
    if(user_id !== '' && token!==''){
      //Get User Data
      User.findOne({$and:[
          {_id:user_id},
          {token:token}
      ]},function(err,userData){
        if(err){
          return res.sendStatus(400);
        }
        if(userData){
          res.status(200).json({
            message:Cmessage.updatetoken.DEVICE_TOKEN_MATCH,
            DeviceTokenAck:Cmessage.condition.FALSE
          }); 
        }else{
          User.findOne({_id:user_id},function(err,updUserData){
            if(err){
              return res.sendStatus(400);
            }

            if(updUserData)
            {
              updUserData.token = token;
              updUserData.deviceType = device_type;
              updUserData.save(function(err,updated){
                  if(err){
                    return res.sendStatus(400);
                  }
                  if(updated){
                    res.status(200).json({
                      message:Cmessage.updatetoken.DEVICE_TOKEN_UPDATED,
                      DeviceTokenAck:Cmessage.condition.TRUE
                    }); 
                  }
              });
            }else{
              res.status(200).json({
                message:Cmessage.updatetoken.USER_NOT_LOGIN,
                DeviceTokenAck:Cmessage.condition.FALSE
              });
            }            

          }); //End User Data
        } 
      }); //End User Data
    }else{
      if(user_id == ""){
        res.status(200).json({
          message:Cmessage.updatetoken.USER_NOT_LOGIN,
          DeviceTokenAck:Cmessage.condition.FALSE
        });
    }else{
      res.status(200).json({
        message:Cmessage.updatetoken.REQUIRED_FIELDS,
        DeviceTokenAck:Cmessage.condition.FALSE
      });
    }
  }
};

//x1. Twilio SMS send
exports.sendSmsToUser = function(req,res){
	try {
	    if (config.twilio.required) {
			//All the parameters req are defined in variable
			var phone = req.body.phone;
            if(!phone){
                return res.status(200).json({
                  message: Cmessage.user.VALID_PHONE,
                  UserOtpAck: Cmessage.condition.FALSE
                });
            }
			var otpLength = req.body.otpLength!=null?req.body.otpLength:6;
		    var otp = general.randomNumber(otpLength);
			general.sendOtpSms(phone, otp);
			res.status(200).json({
      			message: Cmessage.user.REGISTRATION_OTP_SENT_SUCCESS,
      			UserOtpAck: Cmessage.condition.TRUE,
      			otp : otp
      		});
	    }
	} catch (e){
		console.log("error"+e)
        return res.sendStatus(500);
	}
};

exports.userimage = function(req,res){
  
  var appurl = 'public/user/';
  
  User.find()
     .exec(function(error,users){
       
       var updatedUser = [];
       users.forEach(function(user){
          
          if(user.photo)
          {
            var sourceImage = appurl+user.photo;
            if(fs.existsSync(sourceImage)){
              
            var aws_file_url = awsSdk.uploadeUserPhoto(sourceImage);
            
            if(aws_file_url && aws_file_url != 0)
            {
              user.photo = aws_file_url;
              user.photoname = user.photo;
              user.save();
              updatedUser.push(user);
              
            }
          }
         }
       });
       
      res.status(200).json({
        users: updatedUser
      });

     });
     
};


exports.userBirthDate = function(req,res){
  
  var appurl = 'public/user/';
  
  User.find()
     .exec(function(error,users){
       
       var updatedUser = [];
       users.forEach(function(user){
          
          if(user.birthDate)
          {

            var date = new Date(user.birthDate);      
            
            if(date == 'Invalid Date')
            {
              date = '';
            }

            

            // var date = (user.birthDate)?moment(user.birthDate,'MM/DD/YYYY'):'';
            //  var curr_date = date.getDate();
            //  var curr_month = date.getMonth();
            //  var curr_year = date.getFullYear();

            // var date = curr_month+'/'+curr_date+'/'+curr_year;          
            // var date = user.birthDate.split("/"); 


            //  user.photo = aws_file_url;
            //    user.photoname = user.photo;
            //  user.save();

            updatedUser.push({id:user._id,name:user.userName,bdate:date});
          
         }
       });
       
      res.status(200).json({
        users: updatedUser
      });

     });
     
};



function generatePass(){

    var keylistalphaCaps ="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var keylistalpha="abcdefghijklmnopqrstuvwxyz";
    var keylistint="123456789";
    var keylistspec="!@#_";
    var temp='';
    
    for (var i=0;i<2;i++)
        temp+=keylistalphaCaps.charAt(Math.floor(Math.random()*keylistalphaCaps.length));

    for (var i=0;i<2;i++)
        temp+=keylistalpha.charAt(Math.floor(Math.random()*keylistalpha.length));

    for (var i=0;i<2;i++)
        temp+=keylistspec.charAt(Math.floor(Math.random()*keylistspec.length));

    for (var i=0;i<2;i++)
        temp+=keylistint.charAt(Math.floor(Math.random()*keylistint.length));

    temp=temp.split('').sort(function(){return 0.5-Math.random()}).join('');

    return temp;
}

exports.updateusername = function(req,res){
  
    User.find({},function(err,users){

      if(!err)
      {
        users.forEach(function(user){
          user.userName = user.userName.toLowerCase();
          user.save(); 
        });
        res.status(200).json({
          Request:'Done'
        });

      }
    });
  
};