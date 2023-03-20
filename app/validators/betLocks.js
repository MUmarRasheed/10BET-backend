
const { body } = require("express-validator");
const messages = require("../messages/messages");

module.exports.validate = (method) => {
  switch (method) {
    case "addBetLock": {
    return [
        body('selectedUsers')
            .optional()
            .isArray({ min: 1 })
            .withMessage('Please provide an array of selected user IDs.'),
        body('allUsers').optional().isBoolean().withMessage('Invalid value for allUsers.'),
    ];
    }
  }
};