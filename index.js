const express = require('express')
const cors = require('cors');
// JWT 
const jwt = require('jsonwebtoken');
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
        //user
        const usersCollection = client.db('doctors_portal').collection('users');

        //service collection get all service
        app.get('/service', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();

            res.send(services)

        })

        // users collection 
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            // thakle update, na thakle create
            const options = { upsert: true };

            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            // for JWT create
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            //send data
            res.send({ result, token })
        })


        //warning 
        // available service api
        //this is not the proper way to query 
        // after learning more about mongodb. use aggregate lookup, pipeline, match, group
        app.get('/available', async (req, res) => {
            // const date = req.query.date || 'May 20, 2022';
            const date = req.query.date;

            // step 1:  get all services ---------------
            const services = await serviceCollection.find().toArray();

            // step 2: get the booking of that day. output [{},{},{},{},{},{}]
            const query = { date: date };
            const bookings = await bookingCollection.find(query).toArray();

            // step 3: for each service
            services.forEach(service => {
                // step 4: find booking for that service. output [{},{},{},{}]
                const serviceBookings = bookings.filter(book => book.treatment === service.name)
                // step 5: select slots for the service bookings:['','','','']
                const bookedSlots = serviceBookings.map(book => book.slot);
                // step 6: select those slots that are not in bookedSlots
                const available = service.slots.filter(slot => !bookedSlots.includes(slot));
                // step 7: set available slots to make it easier
                service.slots = available;

            });



            // step 3: for each service, find booking for that service --------------
            // not recommended way -----**
            /*   services.forEach(service => {
                  // b= booking
                  const serviceBooking = bookings.filter(b => b.treatment === service.name);
                  const booked = serviceBooking.map(s => s.slot);   // s= service
                  // service.booked = booked
                  // service.booked = serviceBooking.map(s => s.slot);
                  const available = service.slots.filter(s => !booked.includes(s));
                  service.available = available;
  
              }) */



            res.send(services);

        })


        /**
        * API Naming Convention ----
        * app.get('/booking')   // get all bookings in this collection . ot get more then one or by filter
        * app.get('/booking/:id') //get a specific booking 
        * app.post('/booking') // add a new booking
        * app.patch('booking/:id') // update selected item
        * app.put(/booking/:id) // upsert => update (if exists) of insert ( if doesn't exists)
        * app.delete('booking/:id') // deleted selected item
        */

        // booking ------------------------------------

        //get booking data
        app.get('/booking', async (req, res) => {
            const patient = req.query.patient;
            const query = { patient: patient };
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        })

        //send data
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            //check data existence {part 1} {treatment name, date , patient}
            const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
            //find (jodi item same date a thake taile {part-2} )
            const exists = await bookingCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, booking: exists })
            }
            const result = await bookingCollection.insertOne(booking);
            return res.send({ success: true, result });
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