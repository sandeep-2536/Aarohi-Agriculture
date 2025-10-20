// app.js (The new, cleaner main file)

const express = require("express");
const app = express();
const ejsMate = require("ejs-mate");
const path = require("path");
const methodOverride=require('method-override');

// const fetch = require('node-fetch'); // Not needed here if imported in router files
// const multer = require('multer'); // Not needed here, only in ai-disease.js
// const { GoogleGenerativeAI } = require("@google/generative-ai"); // Not needed here, only in ai-disease.js
require('dotenv').config();
const PORT = process.env.PORT||3000;

// =============> REQUIRE ROUTE FILES <=============
const weatherRoutes = require('./routes/weather');
const aiDiseaseRoutes = require('./routes/ai-disease');
const animaltradingRoutes =require('./routes/animalecom');
const communityRoutes =require('./routes/community');
const cropSupplyRoutes = require('./routes/cropSupply');
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.engine('ejs', ejsMate)
app.set("view engine","ejs");
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));



// app.use(methodOverride('_method'));
// app.use(session({
//   secret: 'supersecretkey',
//   resave: false,
//   saveUninitialized: false
// }));
// app.use(flash());

// ----------------------
// 🌍 Global Middleware
// ----------------------
// app.use((req, res, next) => {
//   res.locals.success = req.flash('success');
//   res.locals.error = req.flash('error');
//   next();
// });

// =============> HOME ROUTE <=============
app.get("/",(req,res)=>
{
    res.render("home.ejs");
})

// =============> USE SEPARATE ROUTERS <=============
// Mount the weather routes. The base path for all routes in weather.js will be /features/weather
app.use('/features/weather', weatherRoutes); 

// Mount the AI disease routes. The base path for all routes in ai-disease.js will be /features/ai-disease
app.use('/features/ai-disease', aiDiseaseRoutes); 
// Note: You must update the POST route in ai-disease.js from /api/weather to /api 
// and the POST route in ai-disease.js from /ai-disease/detect to /detect

app.use('/features/animaltrading', animaltradingRoutes); 
app.use('/features/community', communityRoutes); 


app.use('/features/crops', cropSupplyRoutes);


app.listen(PORT,()=>
{
    console.log("Connected to localhost 3000");
    
})