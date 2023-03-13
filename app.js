const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const hbs=require('express-handlebars');
const helpers=require('handlebars-helpers')();
const handlebars = require('handlebars');
const colors=require('colors')



const userRouter = require('./routes/users');
const adminrouter = require('./routes/admin')
const {initDb}= require('./models/db')
const dotenv=require('dotenv')
dotenv.config({path:"./config.env"})
const app = express();



// handlebar helpers 
handlebars.registerHelper('inc',function(value){
  return parseInt(value)+1;
  })
  

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs',hbs.engine({extname:'hbs',defaultLayout:'layout',layoutsDir:__dirname+'/views/layout/',partialsDir:__dirname+'/views/partials',helpers:helpers}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', userRouter);
app.use('/admin', adminrouter);


// mongo connection
initDb((err, db) => {
  if (err) {
    console.log(err);
  } else {
   console.log(`\n mongo connection successfull \n`.bold);
  }
});


// catch 404 and forward to error handler


// app.use(function(req, res, next) {
  
//   next(createError(404));

// });

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  console.log(err);

  res.render("user/404")

  res.locals.message = "errroorrrr"
  res.locals.error = req.app.get('env') === 'development' ? err : {};

if(err.statusCode === 404){
  res.render("user/404")
}else{


  // render the error page
  res.status(err.status || 500);
  res.render("user/404")
}
});



module.exports = app;
