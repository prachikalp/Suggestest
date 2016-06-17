'use strict';

module.exports = {
	app: {
		title: 'Globe One - Test Environment'
	},
  database:{
      url:  process.env.MONGOHQ_URL || 'mongodb://localhost/suggestthat-test'
  }
};
