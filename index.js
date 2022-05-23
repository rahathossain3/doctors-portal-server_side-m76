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


// for jwt verifications 
function verifyJWT(req, res, next) {
    // 1: read authHeader
    const authHeader = req.headers.authorization;
    // 2
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    //2.1: jodi token thake (get token)
    const token = authHeader.split(' ')[1];
    // 3: verify
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        //4:next
        next();
        // console.log(decoded); 
    });
    // console.log('abc');
}



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
        //doctor s
        const doctorCollection = client.db('doctors_portal').collection('doctors');


        // for admin verify
        const verifyAdmin = async (req, res, next) => {

            //only admin make admin (verify admin)
            const requester = req.decoded.email;
            const requesterAccount = await usersCollection.findOne({ email: requester });

            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.send(403).send({ message: 'forbidden' });
            }
        }





        //service collection get all service
        app.get('/service', async (req, res) => {
            const query = {};
            // const cursor = serviceCollection.find(query);
            const cursor = serviceCollection.find(query).project({ name: 1 });
            const services = await cursor.toArray();

            res.send(services)

        })

        // get all users
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users)
        })


        //for admin check
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });

        })


        // users Roll  and jwt*********
        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            //only admin make admin (verify admin)
            // -----------------------
            // const requester = req.decoded.email;
            // const requesterAccount = await usersCollection.findOne({ email: requester });

            // if (requesterAccount.role === 'admin') {
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            //send data
            res.send(result)
            // }
            // else {
            //     res.send(403).send({ message: 'forbidden' });
            // }
        })


        // users collection and jwt
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

        //get booking data with jwt verify
        app.get('/booking', verifyJWT, async (req, res) => {
            const patient = req.query.patient;

            //for jwt verification after verifyJWT
            const decodedEmail = req.decoded.email;
            if (patient === decodedEmail) {
                // console.log('auth header', authorization)
                const query = { patient: patient };
                const bookings = await bookingCollection.find(query).toArray();
                return res.send(bookings);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' });
            }
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


        //doctor collection

        //doctor get
        app.get('/doctor', verifyJWT, verifyAdmin, async (req, res) => {
            const doctors = await doctorCollection.find().toArray();
            res.send(doctors);
        })


        // doctor insert
        app.post('/doctor', verifyJWT, verifyAdmin, async (req, res) => {
            const doctor = req.body;
            const result = await doctorCollection.insertOne(doctor);
            res.send(result);
        })
        app.delete('/doctor/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const result = await doctorCollection.deleteOne(filter);
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