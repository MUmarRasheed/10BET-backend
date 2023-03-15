const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
let config = require("config");
let fs = require("fs");
let cors = require("cors");
var morgan = require("morgan");
const apisMiddleware = require("./app/middlewares/apisMiddleware");
const loginMiddleWare = require("./app/middlewares/loginMiddleware");
const aclMiddleware = require("./app/middlewares/aclMiddleware");
const accessMiddleware = require("./app/middlewares/accessMiddleware");
const checkRoleMiddleware = require("./app/middlewares/checkRoleMiddleware");

var rolesContent = fs.readFileSync("config/settings/roles/roles.json");
var roles = JSON.parse(rolesContent);

var content = fs.readFileSync("config/settings/apis/general.json");
var jsonContent = JSON.parse(content);

var apisContent = fs.readFileSync(config.apisFileName);
var jsonApis = JSON.parse(apisContent);

// CONNECT THE DATABASE
let options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 30000 // 30 seconds

};

mongoose.set("strictQuery", false);
mongoose
  .connect(config.DBHost, options)
  .then(() => {
    console.log("Database connected");
  })
  .catch((err) => {
    console.log(` Database did not connect because ${err}`);
  });

// JSON
app.use(express.json());
app.use(morgan("combined"));

// READ FORM DATA
app.use(express.urlencoded({ extended: false }));

app.use(bodyParser.urlencoded({ extended: false })); //support encoded bodies
app.use(bodyParser.json({ strict: false }));
var corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));
app.get("/", (req, res) => {
  res.send("<h2> This is the homepage of Bet99 </h2>");
});

// Allowed Apis on this server
app.use(function (req, res, next) {
  apisMiddleware(req, res, next, jsonApis);
});

//Without Authorization
app.use("/api", require("./app/routes/user").router);

// Login middleware
app.use(function (req, res, next) {
  loginMiddleWare(req, res, next);
});
app.use(function(req,res,next){
  checkRoleMiddleware(req,res,next)
})

// APIS With Authorization
app.use("/api", require("./app/routes/user").loginRouter);
app.use("/api", require("./app/routes/betSizes").loginRouter);
app.use("/api", require("./app/routes/recharges").loginRouter);
app.use("/api", require("./app/routes/modulePermissionsUsers").loginRouter);
app.use("/api", require("./app/routes/modulePermissions").loginRouter);

// // Allowed Apis for this role
// app.use(function (req, res, next) {
// 	aclMiddleware(req, res, next, jsonApis)
// })

// USING THE ROUTES

// LISTEN HERE
app.listen(config.PORT, (err) => {
  if (err) throw new Error(err);
  console.log(`Server is listening on port ${config.PORT}`);
});
