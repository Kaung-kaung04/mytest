var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var session = require("express-session");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// mongoose.connect("mongodb://127.0.0.1/blogger003");
// const db = mongoose.connection;
// db.on("error", console.error.bind("Database error detected"));
// db.on("connected", function(){console.log("Database connected!")});

mongoose.connect(
  "mongodb+srv://kaungkaung:kaungkaung04@blogger001.cwonxdz.mongodb.net/?retryWrites=true&w=majority"
);
const db = mongoose.connection;
db.on("error", console.error.bind("Database error detected"));
db.on("connected", function () {
  console.log("Database connected!");
});

app.use(
  session({
    secret: "NOthingTodoHERE!@@#$%^545",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(function (req, res, next) {
  res.locals.user = req.session.user;
  console.log(res.locals, "res.locals");
  // console.log(req.session);
  next();
});

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
