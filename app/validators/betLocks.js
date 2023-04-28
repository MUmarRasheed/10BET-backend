const { body } = require('express-validator');
const messages = require('../messages/messages');

module.exports.validate = (method) => {
  switch (method) {
    case 'addBetLock': {
      return [
        body('selectedUsers', 'Please provide an array of selected user IDs')
          .optional()
          .isArray()
          .custom((selectedUsers) => {
            if (selectedUsers) {
              selectedUsers.forEach((user) => {
                if (!user.userId) {
                  throw new Error('Please provide a valid user ID.');
                }
                if (
                  user.bettingAllowed !== undefined &&
                  typeof user.bettingAllowed !== 'boolean'
                ) {
                  throw new Error('Invalid value for bettingAllowed.');
                }
              });
            }
            return true;
          }),
        body('allUsers')
          .optional()
          .isBoolean()
          .withMessage('Invalid value for allUsers.'),
        body('bettingAllowed', 'bettingAllowed is required')
          .optional()
          .isBoolean()
          .withMessage('Invalid value for bettingAllowed'),
        body('marketId', 'marketId is required')
          .exists()
          .isInt()
          .withMessage('marketId must be number'),
      ];
    }
  }
};
