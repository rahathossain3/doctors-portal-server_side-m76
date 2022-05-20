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


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r6cxt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

//mongodb client
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect();
        // console.log('database connected')
        //service 
        const serviceCollection = client.db('doctors_portal').collection('services');

        //booking
        const bookingCollection = client.db('doctors_portal').collection('bookings');

        //service collection get all service
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();

            res.send(services)

        })


        /**
        * API Naming Convention ----
        * app.get('/booking')   // get all bookings in this collection . ot get more then one or by filter
        * app.get('/booking/:id') //get a specific booking 
        * app.post('/booking') // add a new booking
        * app.patch('booking/:id') // update selected item
        * app.delete('booking/:id') // deleted selected item
        */

        // booking ------------------------------------
        //send data
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            //check data existence
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })






    }
    finally {

    }


}

run().catch(console.dir);




// console.log(uri);

app.get('/', (req, res) => {
    res.send('Hello form doctor Uncle!')
})

app.listen(port, () => {
    console.log(`Doctors app listening on port ${port}`)
})