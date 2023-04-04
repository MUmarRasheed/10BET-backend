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
  }
};
