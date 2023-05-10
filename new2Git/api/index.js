const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User.js");
const Place = require("./models/Place.js");
const Booking = require("./models/Booking.js");
const cookieParser = require("cookie-parser");
const imageDownloader = require("image-downloader");
const multer = require("multer");
const fs = require("fs");
const mime = require("mime-types");
const { log } = require("console");

const authinticate = require("./middleware/authinticate.js");

const Cookies = require("universal-cookie");
const cookies = new Cookies();

require("dotenv").config();
const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = "fasefraw4r5r3wq45wdfgw34twdfg";

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);

mongoose.connect("mongodb://127.0.0.1:27017/new2").then(() => {
  console.log("backend server");
});

app.get("/test", async (req, res) => {
  res.json("test ok");
});
app.get("/test2", async (req, res) => {
  res.json("test ok2");
  // const token = req.cookies;
  // console.log("token" , token);
});

app.post("/api/register" , async(req , res)=>{
  const {fname , email , password , cpassword} = req.body;

  if(!fname || !email || !password || !cpassword){
      res.status(422).json({error : "Fill all the details"});
  }

  try{
      // check user is already present
      const preuser = await User.findOne({email:email});

      if(preuser){
          res.status(422).json({error : "This email is Already Exists!"});
      }
      else if(password !== cpassword){
          res.status(422).json({error:"password and Confirm Password Not Match"});
      }
      else{
          const finalUser = new User({
              fname , email , password , cpassword
          });

          // here pasword hashing

          const storeData = await finalUser.save();
          res.status(201).json({status:201 , storeData})
      }
  }
  catch(error){
      res.status(422).json(error);
      console.log(error);
  }
});
app.post("/api/login" , async(req , res)=>{
  const {email , password } = req.body;
  if(!email || !password){
      res.status(422).json({error : "fill all the details"});
  }

  try{
      const userValid = await User.findOne({email:email});
      if(userValid){
          const isMatch = await bcrypt.compare(password , userValid.password);

          if(!isMatch){
              res.status(422).json({error : 'invalid details'})
          }
          else{
              // token generate
              const token = await userValid.generateAuthtoken();

              // cookiegenerate
              res.cookie("usercookie" , token , {
                  expires: new Date(Date.now() + 90000) , 
                  httpOnly:true
              });
              const result = {
                  userValid , 
                  token
              }
              res.status(201).json({status:201 , result})
          }
      }
      else{
          res.status(401).json({ status: 401 , messege : "invalid details"})
      }
  }
  catch(error){
      res.status(401).json({status:401 , error});
      console.log(error);
  }
});
app.get("/api/logout" ,authinticate ,  async(req , res)=>{
  try{
      req.rootUser.tokens = req.rootUser.tokens.filter((curelem)=>{
          return curelem.token !== req.token
      });

      res.clearCookie("usercookie" , {path : '/'});

      req.rootUser.save();

      res.status(201).json({status:201});
  }
  catch(error){
      res.status(401).json({status:401 , error});
  }
});



// app.get("/api/profile/:id", (req, res) => {
//   const {token} = req.cookies;
//   console.log("token_profile", token);
//   // res.send(token);
//   const {id} = req.params;
//   console.log(id);
//   if (token && id) {
//     jwt.verify(token, jwtSecret, {}, async (err, userData) => {
//       if (err) throw err;
//       const { name, email, _id } = await User.findById(userData.id);
//       res.json({ name, email, _id });
//       res.json(await User.findById(userData.id));
//     });
//   } else {
//     res.json(null);
//   }
// });app

console.log({ __dirname });
app.post("/api/upload-by-link", async (req, res) => {
  const { link } = req.body;
  const newName = "photo" + Date.now() + ".jpg";
  console.log("/api/upload-by-link", link);
  await imageDownloader.image({
    url: link,
    dest: __dirname + "/uploads/" + newName,
  });
  // const url = await uploadToS3('/tmp/' +newName, newName, mime.lookup('/tmp/' +newName));
  res.json(newName);
  console.log(newName)
});

const photosMiddleware = multer({ dest: "uploads/" });
app.post(
  "/api/upload",
  photosMiddleware.array("photos", 100),
  async (req, res) => {
    const uploadedFiles = [];
    for (let i = 0; i < req.files.length; i++) {
      const { path, originalname } = req.files[i];
      // const newName = originalname.replace(/\.[^/.]+$/,'');
      // console.log(path , newName);
      const parts = originalname.split(".");
      const ext = parts[parts.length - 1];
      const newPath = path + "." + ext;
      console.log(parts, newPath, ext);

      fs.renameSync(path, newPath);
      uploadedFiles.push(newPath.replace("uploads", " "));
      console.log(newPath);
    }
    res.json(`${req.files[0].filename}.jpg`);
    console.log(`${req.files[0].filename}.jpg`);
  }
);

app.post("/api/places", async (req, res) => {
  const { token } = req.cookies;
  console.log(token);
  const {
    title,
    address,
    description,
    price,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    addedPhotos,
  } = req.body;
  console.log(addedPhotos);
  jwt.verify(
    token,
    jwtSecret,
    {},
    async (err, userData) => {
      if (err) throw err;
      const placeDoc = await Place.create({
        owner: userData.id,
        price,
        title,
        address,
        description,
        perks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuests,
        photos: addedPhotos,
      });
      res.json(placeDoc);
    }
  );
});

app.get("/api/user-places", (req, res) => {
  const {token} = req.cookies;
  // console.log(token);
  jwt.verify(
   token,
    jwtSecret,
    {},
    async (err, userData) => {
      const { id } = userData;
      res.json(await Place.find({ owner: id }));
    }
  );
});

app.put("/api/places/", async (req, res) => {
  const { token } = req.cookies;
  const {
    id,
    title,
    address,
    addedPhotos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    price,
  } = req.body;
  jwt.verify(
    token,
    jwtSecret,
    {},
    async (err, userData) => {
      if (err) throw err;
      const placeDoc = await Place.findById(id);
      if (userData.id === placeDoc.owner.toString()) {
        placeDoc.set({
          title,
          address,
          photos: addedPhotos,
          description,
          perks,
          extraInfo,
          checkIn,
          checkOut,
          maxGuests,
          price,
        });
        await placeDoc.save();
        res.json("ok");
      }
    }
  );
});

app.get("/api/places/:id", async (req, res) => {
  // res.json(req.params);
  const { id } = req.params;
  res.json(await Place.findById(id));
});

app.get("/api/places", async (req, res) => {
  res.json(await Place.find());
});

function getUserDataFromReq(req) {
  const {token} = req.cookies;
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      jwtSecret,
      {},
      async (err, userData) => {
        if (err) throw err;
        resolve(userData);
      }
    );
  });
}

app.post("/api/bookings", async (req, res) => {
  const userData = await getUserDataFromReq(req);
  const { place, checkIn, checkOut, numberofGuests, name, phone, price } =
    req.body;
  await Booking.create({
    place,
    checkIn,
    checkOut,
    numberofGuests,
    name,
    phone,
    price,
    user: userData.id,
  })
    .then((response) => {
      res.json(response);
    })
    .catch((err) => {
      res.json(err);
    });
});

app.get("/api/bookings", async (req, res) => {
  const userData = await getUserDataFromReq(req);
  res.json(await Booking.find({ user: userData.id }).populate("place"));
});

app.listen(5000, () => {
  console.log("server runnung");
});
