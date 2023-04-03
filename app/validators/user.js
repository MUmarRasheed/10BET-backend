const { body, check } = require("express-validator");
const Users = require("../models/user");

module.exports.validate = (method) => {
  switch (method) {
    case "registerUser": {
      return [
        body("userName", "userName is required")
          .exists()
          .isString()
          .withMessage(" userName must be string"),
        body("reference", "reference is required")
          .exists()
          .isString()
          .withMessage(" reference must be string"),
        body("isActive", "isActive is required")
          .exists()
          .isBoolean()
          .withMessage(" isActive must be Boolean"),
        body("balance", "balance is required")
          .exists()
          .isInt()
          .withMessage(" balance must be number"),
        body("downLineShare", "downLineShare is required")
          .optional()
          .isInt()
          .withMessage(" downLineShare must be number"),
        body("phone", "phone is required")
          .exists()
          .isString()
          .withMessage(" phone must be string")
          .isLength({ min: 11, max: 14 })
          .withMessage(" phone min 11, max 14"),
        body("password", "password is required")
          .exists()
          .isString()
          .withMessage("password must be string")
          .isLength({ min: 8 })
          .withMessage("password has minimun 8 characters")
          .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
          .withMessage(
            "Please enter a password at least 8 character and contain At least one uppercase. At least one lower case. At least one special character. At least one digit"
          ),
      ];
    }
    case "login": {
      return [
        body("userName", "userName is required")
          .exists()
          .isString()
          .withMessage(" userName must be string")
          .notEmpty()
          .withMessage("userName cannot be null"),
        body("password", "password is required")
          .exists()
          .isString()
          .withMessage("password must be string")
          .notEmpty()
          .withMessage("password cannot be null")
          .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[a-zA-Z\d@$.!%#?&]/)
          .withMessage(
            "Please enter a password at least 8 character and contain At least one uppercase.At least one lower case.At least one special character.At least One digit"
          ),
      ];
    }
    case "loadUserBalance": {
      return [
        body("userId", "userId is required")
          .exists()
          .isString()
          .withMessage(" userId must be string"),
        body("role", "role is required")
          .exists()
          .isString()
          .withMessage(" role must be string"),
        body("loadedAmount", "loadedAmount is required")
          .exists()
          .isInt()
          .withMessage("loadedBalance must be integer"),
      ];
    }
    case "changePassword": {
      return [
        body("password", "password is required")
          .exists()
          .isString()
          .withMessage(" password must be string"),
      ];
    }
    case "updateUser": {
      return [
        body("password", "password is required")
          .optional()
          .isString()
          .withMessage(" password must be string")
          .notEmpty()
          .withMessage("password cannot be empty"),
        body("isActive", "isActive is required")
          .exists()
          .isBoolean()
          .withMessage(" isActive must be Boolean")
          .notEmpty()
          .withMessage("isActive cannot be empty"),
        body("bettingAllowed", "bettingAllowed is required")
          .isBoolean()
          .withMessage(" bettingAllowed must be Boolean"),
        body("canSettlePL", "canSettlePL is required")
          .exists()
          .isBoolean()
          .withMessage(" canSettlePL must be Boolean"),
        body("phone", "phone is required")
          .exists()
          .isString()
          .withMessage(" phone must be string"),
        body("reference", "reference is required")
          .exists()
          .isString()
          .withMessage(" reference must be string"),
        body("notes", "notes is required")
          .exists()
          .isString()
          .withMessage(" notes must be string"),
      ];
    }
	case 'searchUsers': {
		return [
		  body('userName', "userName is required")
			.exists()
			.isString()
			.withMessage('userName must be string '),
		]
	  }
  case 'getSingleUser': {
    return [
      body('id', "id is required")
      .exists()
      .isString()
      .withMessage('id must be string '),
    ]
    }
  case 'activeUser': {
    return [
      body('id', "id is required")
      .exists()
      .isString()
      .withMessage('id must be string '),
      ]
    }
  case 'deactiveUser': {
    return [
      body('id', "id is required")
      .exists()
      .isString()
      .withMessage('id must be string '),
      ]
    }
    case 'checkValidation': {
      return [
        check('userName').custom((userName) => {
          return Users.findOne({userName}).then(user => {
            if (user == null) {
              return Promise.reject('user does not exist')
            }else {
              return Promise.reject('user already exists')
            }
          })
        })
      ]
    }
  }
};
