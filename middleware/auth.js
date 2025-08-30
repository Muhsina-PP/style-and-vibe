const User = require("../models/userSchema")


const userAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    next(); // This is important to continue to the updateProfile controller
  } else {
    res.redirect('/login');
  }
};

const adminAuth = async (req, res, next) => {
  try {
    
    await User.findOne({ isAdmin: true });

    if (req.session.admin) {
      next();
    } else {
      res.redirect("/admin/login");
    }
  } catch (error) {
    console.log("Error in admin auth middleware:", error);
    res.status(500).send("Internal Server Error");
  }
};


module.exports = { userAuth, adminAuth}