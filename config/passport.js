const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
const env = require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
    
        if (user) {
          if (user.isBlocked) {
            console.log("User is blocked:", user.email);
            return done(null, false, { message: "User is blocked" });
          }
          console.log("Google login successful:", user.email);
          return done(null, user);
        } else {
          const existingUser = await User.findOne({ email: profile.emails[0].value });
          if (existingUser && existingUser.isBlocked) {
            console.log("Blocked user tried to sign up again:", existingUser.email);
            return done(null, false, { message: "Blocked user can't signup again" });
          }
    
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
          });
          await user.save();
          console.log("New user created:", user.email);
          return done(null, user);
        }
      } catch (error) {
        console.error("Error in Google strategy:", error);
        return done(error, null);
      }
    }
    
    
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err, null));
});

module.exports = passport;
