module.exports = {
	app: {
    	title: 'SuggestThat - Development Environment'
  	},
    database: 
    {
    	url: process.env.MONGOHQ_URL || 'mongodb://localhost:27017/suggesthatmigration'
    },
    baseUrl:{
    	url:'http://suggesthat.com/'
    },
    tinyurl:{
        url:'http://tinyurl.com/gq5tn3t'
    },
    twilio : {
        required : true,
        accountSID : 'AC3469c4ead997fb285f1cdc03b31ba345',
        authToken : '1d551e62009f895ae4e62b333b7de218',
        from : '+12243026352'
    }
};