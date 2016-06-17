var aws = require('aws-sdk');
var fs = require('fs');
var path = require('path');

aws.config.loadFromPath('./AwsConfig.json');

var BUCKET_NAME = 'suggesthat';
var s3 = new aws.S3();

var _this = this;

exports.uploadeUserPhoto = function(fileName){  

  var url = 0;
  if(path){

    var file  = path.basename(fileName);
    var Extension = path.extname(fileName);
    var fileExtension = Extension.split('.').pop();
   
    
    var fileBuffer = fs.readFileSync(fileName);

    var metaData = _this.getContentTypeByFile(file);

    var image_ext = ['jpg','jpeg','gif','png'];  
    var audio_ext = ['mp3','wav'];
    var video_ext = ['mp4','flv'];
    
    var directory = '';    
    var contentType = '';
    var contentTypeInner = '';   

    if(image_ext.indexOf(fileExtension) > -1) {
        directory = 'images/user';
    }else if(image_ext.indexOf(fileExtension) > -1) { // Upload Group Images on AWS  
        directory = 'images/user';
    }else if(image_ext.indexOf(fileExtension) > -1){
      
        directory = 'images/user';
    }else if(video_ext.indexOf(fileExtension) > -1){
      directory = 'images/user';
      contentType = 'application/octet-stream';
      contentTypeInner = 'video/mp4';
    }else if(audio_ext.indexOf(fileExtension) > -1){
      directory = 'images/user';
      contentType = 'application/octet-stream';
      contentTypeInner = 'audio/mpeg';
    }

    if(directory!=''){    
      s3.putObject({
        ACL: 'public-read',
        Bucket: BUCKET_NAME,
        Key: directory+'/'+file,
        Body: fileBuffer,
        ContentType: metaData
      }, function(error, response) {
        //console.log('uploaded file[' + fileName + '] to ['+ Key + '] as [' + metaData + ']');
        //console.log(response);

      });
    }
    
    var params = {Bucket: BUCKET_NAME, Key: directory+'/'+file};
    var url = s3.getSignedUrl('putObject', params);
  }

  url = url.split('&');    
  url.pop();
  url_final = url.toString(); 

  return url_final;  

};

exports.uploadAWSFile = function(fileName,isThumb) {
  var url = 0;
  if(path){
  var file  = path.basename(fileName);
  var Extension = path.extname(fileName);
  var fileExtension = Extension.split('.').pop();
 
  
  var fileBuffer = fs.readFileSync(fileName);

  var metaData = _this.getContentTypeByFile(file);

  var image_ext = ['jpg','jpeg','gif','png'];  
  var audio_ext = ['mp3','wav'];
  var video_ext = ['mp4','flv'];
  
  var directory = '';    
  var contentType = '';
  var contentTypeInner = '';   

  if(image_ext.indexOf(fileExtension) > -1 && isThumb == 1) {
      directory = 'images/thumbnail';
  }else if(image_ext.indexOf(fileExtension) > -1 && isThumb == 2) { // Upload Group Images on AWS  
      directory = 'group';
  }else if(image_ext.indexOf(fileExtension) > -1 && isThumb == 0){
    
      directory = 'images';
  }else if(video_ext.indexOf(fileExtension) > -1 && isThumb == 0){
    directory = 'video';
    contentType = 'application/octet-stream';
    contentTypeInner = 'video/mp4';
  }else if(audio_ext.indexOf(fileExtension) > -1 && isThumb == 0){
    directory = 'audio';
    contentType = 'application/octet-stream';
    contentTypeInner = 'audio/mpeg';
  }

  if(directory!=''){    
    s3.putObject({
      ACL: 'public-read',
      Bucket: BUCKET_NAME,
      Key: directory+'/'+file,
      Body: fileBuffer,
      ContentType: metaData
    }, function(error, response) {
      //console.log('uploaded file[' + fileName + '] to ['+ Key + '] as [' + metaData + ']');
      //console.log(response);

    });
  }
  
    var params = {Bucket: BUCKET_NAME, Key: directory+'/'+file};
    var url = s3.getSignedUrl('putObject', params);
    
  } 

  url = url.split('&');    
  url.pop();
  url_final = url.toString(); 

  return url_final;

};

exports.deleteAWSFile = function(fileName,isThumb){
 if(path){
   var Extension = path.extname(fileName);    
   var fileExtension = Extension.split('.').pop();
   var image_ext = ['jpg','jpeg','gif','png'];  
   var audio_ext = ['mp3','wav'];
   var video_ext = ['mp4','flv'];
   var directory = '';    
   
    if(image_ext.indexOf(fileExtension) > -1 && isThumb == 1) {
      directory = 'images/thumbnail';
    }else if(image_ext.indexOf(fileExtension) > -1 && isThumb == 2) { // Upload Group Images on AWS  
      directory = 'group';
    }else if(image_ext.indexOf(fileExtension) > -1 && isThumb == 0){
      directory = 'images';
    }else if(video_ext.indexOf(fileExtension) > -1 && isThumb == 0){
      directory = 'video';
    }else if(audio_ext.indexOf(fileExtension) > -1 && isThumb == 0){
      directory = 'audio';
    }else if(audio_ext.indexOf(fileExtension) > -1 && isThumb == 3){
      directory = 'images/user';
    }

    if(directory!=''){
     var params = {
       Bucket: BUCKET_NAME, /* required */
       Key: directory+'/'+fileName /* required */      
     };

      s3.deleteObject(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
      }); 
    }
  }
 };

exports.getContentTypeByFile = function(fileName) {
  var rc = 'application/octet-stream';
  var fn = fileName.toLowerCase();

  if (fn.indexOf('.html') >= 0) rc = 'text/html';
  else if (fn.indexOf('.css') >= 0) rc = 'text/css';
  else if (fn.indexOf('.json') >= 0) rc = 'application/json';
  else if (fn.indexOf('.js') >= 0) rc = 'application/x-javascript';
  else if (fn.indexOf('.png') >= 0) rc = 'image/png';
  else if (fn.indexOf('.jpg') >= 0) rc = 'image/jpg';
  else if (fn.indexOf('.jpeg') >= 0) rc = 'image/jpeg';
  else if (fn.indexOf('.gif') >= 0) rc = 'image/gif';
  else if (fn.indexOf('.mp4') >= 0) rc = 'video/mp4';
  else if (fn.indexOf('.flv') >= 0) rc = 'video/mp4';
  else if (fn.indexOf('.mp3') >= 0) rc = 'audio/mpeg';
  else if (fn.indexOf('.wav') >= 0) rc = 'audio/mpeg';


  return rc;
};


