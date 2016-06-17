'use strict';

var Category       = require('../models/category.server.model'),
    SuggestionType = require('../models/suggestiontype.server.model'),
    async          = require('async'),
    Cmessage       = require('../helpers/common');  // added common.js file

//10th Api category
exports.catgeoryInfo = function (req,res) {

  var categories = [];
  
  Category.find({},function(err,categoriesData){
    if(err){
      return res.sendStatus(400);
    }
    if(categoriesData){
      async.each(categoriesData, function(categoryData, asyncCallback) {

        SuggestionType.find({catId:categoryData._id})
              .populate('catId')
              .sort({name:1,catId:1})
              .exec(function(err,SuggestionTypes){
          if(err){
            console.log(err);
            return asyncCallback(err);                    
          }

          if(SuggestionTypes && SuggestionTypes.length > 0)
          {
            var subcategories = [];    
            SuggestionTypes.forEach(function(SuggestionType){
              var Type = (SuggestionType.name)?SuggestionType.name:'';
              var apiType = (SuggestionType.apiType)?SuggestionType.apiType:'';                  
                subcategories.push({'Id':SuggestionType._id.toString(),'Type':Type,'api_type':apiType});                  
            });

            categories.push({'id':categoryData._id.toString(),'title':categoryData.title,'subcategories':subcategories});
          }      
          
          asyncCallback();

        });
      },
        function(err){
          if(err) {
            return res.sendStatus(400);
          }
          res.status(200).json({
            Category:categories,
            message:Cmessage.category.CAT_FOUND,
            SuggestThatCategory:Cmessage.condition.TRUE    
          });    
   
    });  
    }else{
        res.status(200).json({
          message:Cmessage.category.CAT_NOT_FOUND,
          SuggestThatCategory:Cmessage.condition.FALSE
        });
    }
  });
};

//Get for Category
exports.catgeoryGet = function (req,res) {

  var categories = [];
  
  Category.find({},function(err,categoriesData){
    if(err){
      return res.sendStatus(400);
    }
    if(categoriesData){
      async.each(categoriesData, function(categoryData, asyncCallback) {

        SuggestionType.find({catId:categoryData._id})
              .populate('catId')
              .sort({name:1,catId:1})
              .exec(function(err,SuggestionTypes){
          if(err){
            console.log(err);
            return asyncCallback(err);                    
          }

          if(SuggestionTypes && SuggestionTypes.length > 0)
          {
            var subcategories = [];    
            SuggestionTypes.forEach(function(SuggestionType){
              var Type = (SuggestionType.name)?SuggestionType.name:'';
              var apiType = (SuggestionType.apiType)?SuggestionType.apiType:'';                  
                subcategories.push({'Id':SuggestionType._id,'Type':Type,'api_type':apiType});                  
            });

            categories.push({'id':categoryData._id,'title':categoryData.title,'subcategories':subcategories});
          }      
          
          asyncCallback();

        });
      },
        function(err){
          if(err) {
            return res.sendStatus(400);
          }
          res.status(200).json({
            Category:categories,
            message:Cmessage.category.CAT_FOUND,
            SuggestThatCategory:Cmessage.condition.TRUE    
          });    
   
    });  
    }else{
        res.status(200).json({
          message:Cmessage.category.CAT_NOT_FOUND,
          SuggestThatCategory:Cmessage.condition.FALSE
        });
    }
  });
};

//11th Api categorytype
//Insert Category Id and findou suggestions for that
exports.categoryType = function(req,res){
  var id = req.body.id;  //Category Id
  if(id){
      SuggestionType.find({catId:id})
          .populate('catId')
          .sort({name:1})
          .exec(function(err,SuggestionTypes){
          if(err){
            return res.sendStatus(400);
          }
          if(SuggestionTypes && SuggestionTypes.length>0){
            var requests = [];
            SuggestionTypes.forEach(function(SuggestionType){
              var Type = (SuggestionType.name)?SuggestionType.name:'';
              var apiType = (SuggestionType.apiType)?SuggestionType.apiType:''; 
                requests.push({'Id':SuggestionType._id.toString(),'Type':Type,'api_type':apiType});  
            });

            res.status(200).json({
              Type:requests,
              message:Cmessage.category.DATA_FOUND,
              SuggestThatType:Cmessage.condition.TRUE   
            });

          }else{
            res.status(200).json({
              message:Cmessage.category.NO_DATA,
              SuggestThatType:Cmessage.condition.False
            });
          }
      });
  }else{
    res.status(200).json({
        message:Cmessage.parameters.MESSAGE,
        SuggestThatType:Cmessage.condition.FALSE
    });
  }
};

exports.insertCategory = function(req,res){
  var title = req.body.title?req.body.title:'';
  if(title){
    Category.nextCount(function(err, count) {
    // count === 0 -> true 
    var newCategory = new Category();
    newCategory.title = title;
    newCategory.save(function(err,insertCategory) {
       if(err){
        return res.sendStatus(400);
      } 
      newCategory.nextCount(function(err, count) {
            // count === 1 -> true     
      });
      if(insertCategory){
        res.status(200).json({
          data:insertCategory.toString(),
          ACK:Cmessage.condition.TRUE
        });
      }
    });
});
    
  }else{
    res.status(200).json({
        message:Cmessage.parameters.message,
        ACK:Cmessage.condition.False
    });
  }
};

exports.insertSuggestiontype = function(req,res){
  var catId = req.body.catId;  // Refernce Id of category collection
  var name = req.body.name?req.body.name.trim():'';
  var api_type = req.body.api_type?req.body.api_type.trim():'';

  if(catId){
    SuggestionType.nextCount(function(err,count) {
      var newSuggestionType = new SuggestionType();
      newSuggestionType.catId = catId;
      newSuggestionType.name = name;
      newSuggestionType.apiType = api_type;
      newSuggestionType.save(function(err,insertsuggestionType){
        if(err){
          return res.sendStatus(400);
        }
        newSuggestionType.nextCount(function(err,count) {
              // count === 1 -> true     
              console.log(count);
        });
        if(insertsuggestionType){
          res.status(200).json({
            data:insertsuggestionType.toString(),
            ACK:Cmessage.condition.TRUE
          });
        }
      });
    });
  }else{
    res.status(200).json({
        message:Cmessage.parameters.message,
        ACK:Cmessage.condition.False
    });
  }
};