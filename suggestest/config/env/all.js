module.exports = {
  app: {
    title: 'Suggest That',
    description: 'Suggest That App',
    keywords: 'MEN'
  },
  port: process.env.PORT || 6062,
  sendgrid : {
    username : 'abcvar',
    password : 'prachi@999',
    subject1 : 'Welcome to Suggesthat.',
    subject2 : 'Suggesthat Password recovered.',
    from: 'admin@suggesthat.com'
  },
  sessionSecret: 'super.super.secret.shhh',
  google:{
         google_api_key :'AIzaSyB6jk6RsZ71C3v5w1ETzqd-_t5fJSO1TMc'
  },
  apns:{
    certificate:'SuggesThat_Production.pem', // production
    //certificate:'Certificate-development.pem', // development
    key:'SuggesThat_Production.pem',    // production
    //key:'Certificate-development.pem',    // development
    apn_getway:'gateway.push.apple.com',  // production
    //apn_getway:'gateway.sandbox.push.apple.com', // development
    apn_port: '2195'    
  },
  twilio : {
      required : true,
      accountSID : 'AC3469c4ead997fb285f1cdc03b31ba345',
      authToken : '1d551e62009f895ae4e62b333b7de218',
      from : '+12243026352'
  }
};