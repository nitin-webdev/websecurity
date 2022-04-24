require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require("ejs");
const { response, request } = require('express');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
const md5 = require("md5");
const session = require("express-session");
const MongoDBSession = require("connect-mongodb-session")(session);
// const passport = require("passport");
// const passportLocalMongoose = require("passport-local-mongoose");
const bcrypt = require('bcryptjs');
const ConnectMongoDBSession = require('connect-mongodb-session');
const saltRounds = 10;
var comments = [];

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

// const mongoURI = "mongodb://localhost:27017/userDB";

// app.use(passport.initialize());
// app.use(passport.session());

const mongoURI = "mongodb+srv://nitin-admin:<password>@cluster0.sgpni.mongodb.net/UserDB";


mongoose.connect(mongoURI,{useNewUrlParser: true}).then((res) =>{
    console.log("connected to mogodb successfully");
});

const store = new MongoDBSession({
    uri: mongoURI,
    collection: "mysessions",
});

app.use(session({
    secret : "Our little secret.",
    resave: true,
    saveUninitialized: false,
    store: store,
    cookie: {
        expires: 60*1000
    }
}));

const isAuth = (req, res, next) => {
   if(req.session.isAuth) {
       next()
   } else {
       res.redirect("/login");
   }
}


const userSchema = new mongoose.Schema ({
    firstname: String,
    lastname: String,
    email: String,
    password: String,
    phone: String,
    dateOfBirth: {
        month: Number,
        day: Number,
        year: Number
    },
    gender: String
});

const commentSchema = new mongoose.Schema ({
    data: String
});

const Comment = new mongoose.model("comment", commentSchema);

// userSchema.plugin(passportLocalMongoose);
userSchema.plugin(encrypt, {secret: process.env.KEY , encryptedFields: ['lastname'] });

const User = new mongoose.model("User", userSchema);

app.get("/", function(req,res){
    res.render("home");
    console.log(req.session);
});

app.get("/login", function(req,res){
    res.render("newlogin");
});



app.get("/myaccount", isAuth, function(req,res){
    res.render("myaccount");
});

app.get("/register", function(req,res){
    res.render("newregister");
});

app.get("/signout", function(req, res){
    req.session.destroy((err) => {
        if(err) throw err;
        res.redirect("/");
    });
});

app.get("/linkcard", isAuth, function(req, res){
    res.render("linkcard");
})

app.get("/linkbank", isAuth, function(req,res){
    res.render("linkbank");
})

app.get("/chat", isAuth, function(req,res){
    res.render("mychat", {comments : comments});
})

app.get("/recaptcha", (req,res)=>{
    res.render("captcha");
})

app.post("/recaptcha", function(req,res){
    if(
        req.body.captcha === undefined ||
        req.body.captcha === " " ||
        req.body.captcha === null
    ){
        console.log(req.body.captcha);
        return res.json({"success" : false, "msg" : "Please select captcha"});
    }

    const secretkey = '6LflXGEdAAAAAKbA382md6xeHNqBBFQinVO8QOXR';
    const verifyurl = 'https://google.com/recaptcha/api/siteverify?secret=${secretkey}&response=${req.body.captcha}&remoteip=${req.connection.remoteAddress}';
   
    request(verifyurl, (err, response, body)=>{
      body = JSON.parse(body);

      if(body.success !== undefined && !body.success){
        return res.json({"success" : false, "msg" : "Failed captcha"});
      }

      return res.json({"success" : true, "msg" : "Success captcha verification"});
    });

});


app.post("/register", async function(req,res){
    const email = req.body.email;
    let newUser = await User.findOne({email});
    if(newUser){
        return res.redirect("/register");
    }

    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
                    newUser = new User({
                    firstname: req.body.firstname,
                    lastname: req.body.lastname,
                    email: email,
                    password: hash,
                    phone: md5(req.body.phone),
                    dateOfBirth: {
                        month: req.body.month,
                        day: req.body.day,
                        year: req.body.year
                    },
                    gender: req.body.gender
                });
                newUser.save(function(err){
                    if(err){
                        console.log(err);
                    } else {
                        req.session.isAuth = true;
                        res.render("myaccount");
                        }
                });
            });
});

app.post("/login", function(req,res){
    const email = req.body.email;
    const password = req.body.password;

    const user = User.findOne({email});
    if(!user){
        alert("user not found");
        res.redirect("/login");
    }

    User.findOne({email: email}, function(err, foundUser){
        if(err){
            console.log(err);
            res.redirect("/login");
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, function(err, result){
                    if(result === true){
                        req.session.isAuth = true;
                        res.render("myaccount");
                    }
                });
            }
        }
    });

});

app.post("/chat", function(req, res){
    const com = req.body.mycomment;
    comments.push(com);
    let newcomment = new Comment({
        data: com
    });
    newcomment.save(function(err){
        if(err){
            console.log(err);
        } else {
            console.log("comment saved successfully in database");
            }
    });
    res.redirect("/chat");
  });

let port = process.env.PORT;
if(port == null || port == ""){
    port = 3000;
}

app.listen(port, function(){
    console.log("server is up and running");
});
