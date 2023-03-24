const { body } = require('express-validator');
const messages = require('../messages/messages');

module.exports.validate = (method) => {
  switch (method) {
    case 'cashDepositLedger': {
      return [
        body('startDate', 'startDate is required')
          .exists()
          .isString()
          .withMessage(' startDate must be string'),
        body('endDate', 'endDate is required')
          .exists()
          .isString()
          .withMessage('endDate must be string'),
      ];
    }
  }
};
