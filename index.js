const express = require('express')
const cors = require('cors');
// dotenv config
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');


const app = express()
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const uri = "mongodb+srv://doctor_admin:<password>@cluster0.r6cxt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

app.get('/', (req, res) => {
    res.send('Hello form doctor Uncle!')
})

app.listen(port, () => {
    console.log(`Doctors app listening on port ${port}`)
})