'use strict';

var userController = require('../controllers/users.server.controller');
var requestController = require('../controllers/requests.server.controller');
var suggestionController  = require('../controllers/suggestions.server.controller');
var categoryController = require('../controllers/categories.server.controller');
var groupController = require('../controllers/groups.server.controller'); 
var locationController = require('../controllers/locations.server.controller');

module.exports = function(app) {

  // 5. registration
  app.route('/api/services/action=registration')
    .post(userController.registration);
  
  //2. login
  app.route('/api/services/action=login')
    .post(userController.login);

 // 1. loginauth 
  app.route('/api/services/action=loginauth')
    .post(userController.loginAuth);

 // 3. logout 
  app.route('/api/services/action=logout')
    .post(userController.logout);
  
 //  4. changepassword 
  app.route('/api/services/action=changepassword')
    .post(userController.changePassword);

  //12. forgotpassword
   app.route('/api/services/action=forgotpassword')
    .post(userController.forgotPassword);

  //6. sendfriendrequest
  app.route('/api/services/action=sendfriendrequest')
    .post(requestController.sendFriendrequest);

  //7. managerequest
  app.route('/api/services/action=managerequest')
    .post(requestController.manageRequest);

  //8. filtercontact
  app.route('/api/services/action=filtercontact')
    .post(requestController.filterContact);

  //14. userprofile
  app.route('/api/services/action=userprofile')
    .post(requestController.userProfileInfo);

  //9. myfriends
  app.route('/api/services/action=myfriends')
    .post(requestController.myFriends);

  app.route('/api/services/action=searchfriends')
    .post(requestController.searchFriends);
 
 //10. category
  app.route('/api/services/action=category')
    .post(categoryController.catgeoryInfo)
    .get(categoryController.catgeoryGet);

  //11. categorytype
  app.route('/api/services/action=categorytype')
    .post(categoryController.categoryType);


  //Not Given in doc
  //Optional insert categories and suggestiontype for api section
  app.route('/api/services/action=insertcategory')
    .post(categoryController.insertCategory);

  app.route('/api/services/action=insertsuggestiontype')
    .post(categoryController.insertSuggestiontype);
  //Optional insert categories and suggestiontype for api section 

  //15. postsuggestion
  app.route('/api/services/action=postsuggestion')
    .post(suggestionController.postSuggestion);

  //16. postinstantsuggestion
  app.route('/api/services/action=postinstantsuggestion')
    .post(suggestionController.postInstantSuggestion);

  //17. viewmyfriendsuggestions
  app.route('/api/services/action=viewmyfriendsuggestions')
    .post(suggestionController.viewmyfriendSuggestions);
    
  //18. filtersuggestion
  app.route('/api/services/action=filtersuggestion')
    .post(suggestionController.filterSuggestion);

  // 19. searchlatest
  app.route('/api/services/action=searchlatest')
    .post(suggestionController.searchSuggestions);

  // 20. searchsuggestions
  app.route('/api/services/action=searchsuggestions')
    .post(suggestionController.searchSuggestions);

  // 21. Report suggestion 
  app.route('/api/services/action=reportsuggestion')
    .post(suggestionController.reportSuggestion);

  //22. discardsuggestion
  app.route('/api/services/action=discardsuggestion')
    .post(suggestionController.discardSuggestion);

  //23. postonsuggesthat
  app.route('/api/services/action=postonsuggesthat')
    .post(suggestionController.postonSuggesthat);

  //24. clearallsuggestion
  app.route('/api/services/action=clearallsuggestion')
    .post(suggestionController.clearallSuggestion);

  //25. suggestionalert
  app.route('/api/services/action=suggestionalert')
    .post(suggestionController.suggestionAlert);
  
  //27. Like/Unlike Suggestion
  app.route('/api/services/action=likesuggestion')
    .post(suggestionController.likeSuggestion);

  //53. View Suggestion
  app.route('/api/services/action=viewsuggestion')
    .post(suggestionController.viewSuggestion);

  //28. Suggestion Like List
  app.route('/api/services/action=suggestionlikelist')
    .post(suggestionController.suggestionLikelist);

  //54. Suggestion View List
  app.route('/api/services/action=suggestionviewlist')
    .post(suggestionController.suggestionViewList);
  
  //29. Add Comments
  app.route('/api/services/action=addsuggestioncomments')
    .post(suggestionController.addsuggestionComments);

  //30. Delete Suggestion Comments
  app.route('/api/services/action=deletesuggestioncomments')
    .post(suggestionController.deletesuggestionComments);
  
  //31. Suggestion Comment Listing
  app.route('/api/services/action=suggestioncommentslisting')
    .post(suggestionController.suggestioncommentsListing);
 
  //32. Filter Instant Suggestion  
  app.route('/api/services/action=filterinstantsuggestion')
    .post(suggestionController.filterinstantSuggestion);

   app.route('/api/services/action=friendsuggestion')
    .post(suggestionController.friendSuggestion);

  //33rd Alert count Background Webservice
  app.route('/api/services/action=bg_viewrequest')
    .post(suggestionController.bgviewRequest);

  //34. Comment & Like list with pagination
  app.route('/api/services/action=comment_like_list')
    .post(suggestionController.commentLikelist);

  //35. Instant Suggestion List
  app.route('/api/services/action=instantsuggestion_list')
    .post(suggestionController.instantsuggestionList);

  //52.Check Suggestion  
  app.route('/api/services/action=checksuggestion')
    .post(suggestionController.checkSuggestion);
    
  //36th Api Friend Request
  app.route('/api/services/action=friendrequest')
    .post(requestController.friendRequest);

  //Group functionality
  //37. Create Group and //38. Update Group
  app.route('/api/services/action=creategroup')
    .post(groupController.createGroup);

  // 39. Group List
  app.route('/api/services/action=grouplist')
    .post(groupController.groupList);
    
  // 39. Group List
  app.route('/api/services/action=groupdetail')
    .post(groupController.groupdetail);

  //40. Send Request to join a Group
  app.route('/api/services/action=requestforjoingroup')
    .post(groupController.requestForJoinGroup);

  //41. Get a Group Request List
   app.route('/api/services/action=grouprequestlist')
    .post(groupController.groupRequestList);

  //42. Group Request Update (Accept/Reject)
  app.route('/api/services/action=grouprequeststatusupdate')
    .post(groupController.groupRequestStatusUpdate);

  //43. Add Comment in Group by Group Member
   app.route('/api/services/action=addgroupcomment')
    .post(groupController.addGroupComment);

  //44. List of comments
  app.route('/api/services/action=groupcommentlist')
    .post(groupController.groupCommentList);

  //45. UnMember from the Group
  app.route('/api/services/action=unmemberfromgroup')
    .post(groupController.unmemberFromGroup);

  //46. Delete Group
  app.route('/api/services/action=deletegroup')
    .post(groupController.deleteGroup);

  //47. Delete Group Comment
  app.route('/api/services/action=deletecomment')
    .post(groupController.deleteComment);

  //48. Find Nearby Location
  app.route('/api/services/action=getlocation')
    .post(locationController.getLocation);
    
  //49. Location detail with suggestion list
  app.route('/api/services/action=getlocationdetail')
    .post(locationController.getlocationDetail);

  app.route('/api/services/action=googlelocationlist')
    .post(locationController.googlelLocationList);
  

  //50. Update/Add device Token in Users
  app.route('/api/services/action=updatedevicetoken')
    .post(userController.updateDeviceToken);

  //51. Group Member List
  app.route('/api/services/action=groupmemberlist')
    .post(groupController.groupMemberList);

  app.route('/api/services/action=addgroupmultiplecomment')
    .post(groupController.addGroupMultipleComment);


  app.route('/api/services/action=suggestionsentlist')
    .post(suggestionController.suggestionsentlist);

   app.route('/api/services/action=sendSmsToUser')
    .post(userController.sendSmsToUser);

  app.route('/api/services/action=userimage')
    .post(userController.userimage);


  app.route('/api/services/action=userupdate')
    .post(userController.userBirthDate);

  app.route('/api/services/action=updategroupcomment')
    .post(groupController.updateGroupComment);
  
   app.route('/api/services/action=updateusername')
    .get(userController.updateusername);

  app.route('/api/services/action=getsuggestion')
    .post(suggestionController.getsuggestion);  
  
};