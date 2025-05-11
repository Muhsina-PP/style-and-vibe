const express = require ("express")
const app = express()
const dotenv = require("dotenv")
dotenv.config()
const passport = require("./config/passport")
const session = require ("express-session")
const path = require("path")
const userRouter = require("./routes/userRouter")
const adminRouter = require("./routes/adminRouter")
const db = require("./config/db")
db()

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 72,
    secure: false,
    httpOnly: true
  }
}));

app.use(passport.initialize())
app.use(passport.session())

// Middleware to make session data available in views
app.use((req, res, next) => {
  res.locals.success_msg = req.session.success_msg || null;
  res.locals.error_msg = req.session.error_msg || null;
  next();
});


app.use((req, res, next) => {
  res.locals.user = req.user; // makes user available in all EJS files
  next();
});

// // middleware (add before your routes)
// app.use((req, res, next) => {
//   // console.log("Current session user in middleware:", req.session.user);
//   res.locals.user = req.session.user || null;
//   next();
// });
app.use((req, res, next) => {
  // console.log("Session after logout:", req.session);  // Check if session is cleared
  next();
});


app.use((req,res,next)=>{
  res.set("Cache-Control", "no-store")
  next();
})

app.set("view engine", "ejs")
app.set("views", [path.join(__dirname, "views/user"), path.join(__dirname, "views/admin")])

app.use(express.static(path.join(__dirname, "public")))

app.use("/", userRouter)
app.use("/admin", adminRouter)

app.listen(process.env.PORT, ()=>{
  console.log("Server Running"); 
})

module.exports = app;