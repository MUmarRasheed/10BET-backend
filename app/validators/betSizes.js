const { body } = require("express-validator");
const messages = require("../messages/messages");

module.exports.validate = (method) => {
  switch (method) {
    case "addBetSizes": {
      return [
        body("soccer", "soccer is required")
          .exists()
          .isInt()
          .withMessage(" soccer must be integer"),
        body("tennis", "tennis is required")
          .exists()
          .isInt()
          .withMessage(" tennis must be integer"),
        body("cricket", "cricket is required")
          .exists()
          .isInt()
          .withMessage(" cricket must be integer"),
        body("fancy", "fancy is required")
          .exists()
          .isInt()
          .withMessage(" fancy must be number"),
        body("races", "races is required")
          .exists()
          .isInt()
          .withMessage(" races must be number"),
        body("casino", "casino is required")
          .exists()
          .isInt()
          .withMessage(" casino must be integer"),
        body("greyHound", "greyHound is required")
          .exists()
          .isInt()
          .withMessage("greyHound must be integer"),
        body("bookMaker", "bookMaker is required")
          .exists()
          .isInt()
          .withMessage("bookMaker must be integer"),
        body("tPin", "tPin is required")
          .exists()
          .isInt()
          .withMessage(" tPin must be integer"),
      ];
    }
  }
};
