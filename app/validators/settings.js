const { body } = require('express-validator');
const messages = require('../messages/messages');

module.exports.validate = (method) => {
  switch (method) {
    case 'updateDefaultTheme': {
      return [
        body('oldThemeName', 'please enter oldThemeName')
          .exists()
          .isString()
          .withMessage('oldThemeName must be string'),
        body('newThemeName', 'please enter newThemeName')
          .exists()
          .isString()
          .withMessage('newThemeName must be string'),
      ];
    }
    case 'updateDefaultLoginPage': {
      return [
        body('oldLoginPage', 'please enter oldLoginPage')
          .exists()
          .isString()
          .withMessage('oldLoginPage must be string'),
        body('newLoginPage', 'please enter newLoginPage')
          .exists()
          .isString()
          .withMessage('newLoginPage must be string'),
      ];
    }
    case 'addTermsAndConditions': {
      return [
        body(
          'termAndConditionsContent',
          'please enter termAndConditionsContent'
        )
          .exists()
          .isString()
          .withMessage('termAndConditionsContent must be string'),
      ];
    }
  }
};
