'use strict';

module.exports = {
	condition:{
		TRUE:'true',
		FALSE:'false'
	},
	parameters:{
		MESSAGE:'Please enter valid parameter.',
		PROPER_VALUE:'Please enter parameters with proper value.'
	},
	user:{
		ALREADY_EXISTS:'UserName is already exists.',
		ALREADY_WITH_PHONE_AND_EMAIL:'User is already exists with contact no or email address.',
		EMAIL_EXISTS:'Email is already exists.',
		CONTACT_EXISTS:'ContactNo is already exists.',
		REGISTERED_SUCCESFULLY:'You have successfully registered to the SUGGESTHAT.',
		USERNAME_INVALID:'UserName is not valid.',
		REQUIRED_FIELDS:'Please fillUp all required fields.',
		PROFILE_UPDATED:'User profile updated successfully.',
		ENTER_PARAMETER:'Please enter required parameter.',
		USER_AUTH_FBID:'User is authenticated with FacebookId.',
		USER_NOTAUTH_FBID:'User is not authenticated with FacebookId.',
		USER_REGISTERD:'User registered successfully.',
		NOT_AUTH:'User is not authenticated.',
		AUTH:'User is authenticated.',
		USER_BLOCKED:'User is blocked by admin.',
		LOGOUT_SUCCESS:'Logout successfully',
		OLD_PWD_WRONG:'Old password is wrong.',
		PWD_CHANGED:'Password changed successfully.',
		FORGOT_PWD_SUCCESS:'User is authenticated, and mail has been sent to user email id.',
		VALID_EMAIL:'Please enter valid email',
		VALID_PHONE:'Please enter valid phone number',
		REGISTRATION_OTP_SENT_SUCCESS:'OTP sent successfully',
		REGISTRATION_OTP_SENT_FAILED:'OTP send failed'
	},
	suggestions:{
		NOT_SENT:'Suggestion not sent.',
		SENT:'Suggestion sent successfully.'
	},
	request:{
		ALREADY_SENT:'Request allready sent by this user.',
		SENT:'Request sent successfully.',
		UNFRIEND:'Unfriend request sent successfully.',
		ALREADY_UNFRIEND:'You are no longer friend with this friend.',
		FRIEND_REQUEST:'Friend request accepted successfully.',
		DENIED_REQUEST:'Denied friend request successfully.',
		ALREADY_DENIED:'You already denied this user.',
		FRIENDS_LIST:'User`s friends list.',
		FRIEND_NOT_FOUND:'Friends not found.',
		ENTER_USERID:'Please enter userid.'
	},
	searchfriends:{
		ALL_FRIEND:'All friend found.',
		NO_FRIEND:'No friends found.'
	},
	category:{
		CAT_FOUND:'Category found.',
		CAT_NOT_FOUND:'Category not found.',
		DATA_FOUND:'Data found.',
		NO_DATA:'No data found.'
	},
	filtersuggestion:{
		SUGG_FOUND:'Suggestions found.',
		SUGG_NOT_FOUND:'Suggestions not found.',
		NO_COMMENT:'No comment found'
	},
	filtercontact:{
		USER_NOT_FOUND:'User is not authenticated.',
		CONTACT_FOUND:'Contact information found.',
		CONTACT_NOT_FOUND:'Contact information not found.'
	},
	searchsuggestion:{
		SUGG_FOUND:'Suggestions found.',
		SUGG_NOT_FOUND:'Suggestions not found.',
		NO_COMMENT:'No comment found'		
	},
	suggestionreport:{
		ALREADY_REPORTED:'You have already reported this suggestion.',
		REPORTED_SUCCESS:'Suggestion reported successfully.'
	},
	suggestiondiscard:{
		DEL_SUCCESS:'Suggestion deleted successfully.',
		SUGG_NOT_FOUND:'Suggestion not found!'
	},
	suggestthat:{
		ALREADY_SHARED:'Already shared on SuggesThat.',
		SHARED:'Shared on suggesthat successfully.',
		SUGG_NOT_FOUND:'Suggestion not found!'
	},
	suggestionclearall:{
		SUGG_DEL:'All suggestion deleted successfully.',
		SUGG_NOT_FOUND:'Suggestion not found for this user.'
	},
	suggestionalert:{
		ALERT_FOUND:'Alert found.',
		NO_ALERT:'No alert found.'
	},
	likesuggestion:{
		UNLIKE_SUCCESS:'Unliked successfully.',
		LIKE_SUCCESS:'Liked successfully.',
		USER_NOT_FOUND:'User not found.',
		SUGG_NOT_FOUND:'Suggestion not found.'
	},
	suggestionlikelist:{
		SUCCESS:'Successfully fetched.',
		NO_RESULT:'No result found.',
		SUGG_NOT_FOUND:'Suggestion not found.'
	},
	suggestionviewlist:{
		SUCCESS:'Successfully fetched.',
		NO_RESULT:'No result found.',
		SUGG_NOT_FOUND:'Suggestion not found.'
	},
	addsuggestioncomment:{
		COMMENT_ADD:'Comment added successfully.',
		USER_NOT_FOUND:'User not found.',
		SUGG_NOT_FOUND:'Suggestion not found.'
	},
	delsuggestioncomment:{
		COMMENT_DEL:'Comment deleted successfully.',
		NOT_AUTH_DEL_COMMENT:'Not authorised to delete this comment.',
		NO_RECORD:'Record not found.',
		USER_NOT_FOUND:'User not found.',
		SUGG_NOT_FOUND:'Suggestion not found.'
	},
	suggestioncommentslisting:{
		SUCCESS_FETCH:'Successfully fetched',
		NO_COMMENT:'No comment found',
		SUGG_NOT_FOUND:'Suggestion not found.'
	},
	filterinstantsuggestion:{
		SUGG_NOT_FOUND:'Suggestions not found.'
	},
	friendrequest:{
		FRIEND_REQUEST:'friend request found.',
		NO_FRIEND_REQUEST:'No friend request found.'
	},
	bgviewrequest:{
		ALERT_FOUND: 'Alert found.',
		NO_ALERT_FOUND:'No alert found.'
	},
	commentlikelist:{
		COMMENT_LIKE_FOUND:'Comment & Like found.',
		COMMENT_LIKE_NOT_FOUND:'Comment & Like not found.'
	},
	instantsuggestion_list:{
		ALERT_FOUND:'Alert found.',
		NO_ALERT_FOUND:'No alert found.'
	},
	viewmyfriendssuggestion:{
		SUGG_FOUND:'Suggestions found.',
		SUGG_NOT_FOUND:'Suggestions not found.'
	},
	creategroup:{
		GROUP_NAME_EXISTS:'Group name is already exists.',
		GROUP_UPDATED:'Group detail updated successfully.',
		GROUP_NOT_FOUND:'Group not found or already deleted',
		CREATE_GROUP:'You have successfully Created Group in the SUGGESTHAT.',
		FAILED_CREATE_GROUP:'You have failed to create Group in the SUGGESTHAT.',
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.'
	},
	grouplist:{
		GROUP_LIST:'List of Group',
		GROUP_NOT_FOUND:'No Group Found',
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.'
	},
	requestforjoingroup:{
		USER_INVALID:'User invalid',
		INVITATION_SENT:'Invitation sent sucessfully',
		ALREADY_INVITATION_SENT:'You have already sent invitation to this user.',
		JOIN_REQUEST:'Join request sent successfully',
		ALREADY_JOIN_REQUEST:'You have already sent join request to this Group.',
		GROUP_NOT_FOUND:'Group not found or already deleted',
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.'
	},
	grouprequestlist:{
		USER_NOT_LOGIN:'User not Logged In',
		GROUP_REQUEST:'Group Request List',
		GROUP_REQUEST_NOT_FOUND:'Group request not found'
	},
	grouprequeststatusupdate:{
		STATUS_INVALID:'Inputed status invalid. e.g (1 : Approved, 2 : Declined)',
		ACCEPTED_REQUEST:'  has accepted your request to join ',
		DECLINED_REQUEST:' has declined your request to join ',
		GROUP_NOT_FOUND:'Group not found or already deleted',
		USER_NOT_LOGIN:'User not Logged In'

	},
	addgroupcomment:{
		ADDED_COMMENT:'You have successfully added comment',
		FAILED_ADD_COMMENT:'You have failed to add comment',
		NOT_MEMBER_OF_GROUP:'You can not write comment. You are not a member of this group',
		GROUP_NOT_FOUND:'Group not found or already deleted',
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.'
	},
	addgroupmultiplecomment:{
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.'
	},
	groupcommentlist:{
		SWAPPING_NOT_MATCH:'Swaping Code does not match',
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.',
		GROUP_COMMENTS_LIST:'Group Comments List',
		GROUP_COMMENT_NOT_FOUND:'Group Comment Not found'
	},
	unmemberfromgroup:{
		USER_INVAID:'User invalid',
		LEFT_FROM_GROUP:'You are successfully left from the Group.',
		NOT_MEMBER_OF_GROUP:'You are not a member of the group or Unmember from the group',
		GROUP_NOT_FOUND:'Group not found or already deleted',
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.'
	},
	deletegroup:{
		GROUP_NOT_FOUND:'Group not found or already deleted',
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.',
		GROUP_DELETED:'Your Group deleted from the SUGGESTHAT.'
	},
	deletecomment:{
		GROUP_NOT_FOUND:'Group not found or already deleted',
		USER_NOT_LOGIN:'User not Logged In',
		DELETE_COMMENT:'Comment deleted.',
		COMMENT_NOT_FOUND:'Comment not found or already deleted'
	},
	getlocation:{
		UNIT_MEASURE_SHOULD:'Unit oiff Measurement should be like e.g. M = Miles, K = Kilometers, N = Nautical Miles.',
		NEARBY_LOCATION:'Nearby Location List',
		NEARBY_LOCATION_NOT_FOUND:'Nearby Location not found',
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.'
	},
	getlocationdetail:{
		LOCATION_DETAIL_NOT_FOUND:'Location Detail Not found',
		LOCATION_DETAIL:'Location Detail',
		USER_NOT_LOGIN:'User not Logged In'
	},
	googlelocationlist:{
		LOCATION_SUGGESTION_FOUND:'Location suggestion found.',
		LOCATION_SUGGESTION_NOT_FOUND:'Location suggestion not found.',
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.'
	},
	updatetoken:{
		DEVICE_TOKEN_MATCH:'Device Token Matched',
		DEVICE_TOKEN_UPDATED:'Device Token Updated',
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.'
	},
	groupmemberlist:{
		GROUP_MEMBER_LIST:'Group Member List',
		GROUP_MEMBER_NOT_FOUND:'Group Member is not found',
		USER_NOT_LOGIN:'User not Logged In',
		REQUIRED_FIELDS:'Please fillUp all required fields.'
	},
	checksuggestion:{
		SUGGESTION_EXISTS:'suggestion exits',
		SUGGESTION_NOT_EXISTS:'Suggestion not exits',
		REQUIRED_FIELDS:'Please fillUp all required fields.'
	},
	viewsuggestion:{
		UNLIKE_SUCCESS:'Unliked successfully.',
		ALREADY_VIEWED_SUGGESTION:'Already viewed this suggestion.',
		VIEW_SUCCESS:'View successfully.',
		USER_NOT_FOUND:'User not found.',
		SUGG_NOT_FOUND:'Suggestion not found.'
	}
}; 