const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();


//middlewares
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9rrhg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
  try {
    await client.connect();
    console.log('db connected');
    
    const userCollection = client.db('amrap').collection('users');
    const partCollection = client.db('amrap').collection('parts');
    const orderCollection = client.db('amrap').collection('orders');
    const revoewCollection = client.db('amrap').collection('reviews');


    app.get("/parts",async(req,res)=>{
        const query = req.query;
        const cursor = partCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    })
    app.get("/parts/:id",async(req,res)=>{
        const id = req.params.id;
        const filter = {_id : ObjectId(id)}
        const result = await partCollection.findOne(filter);
        res.send(result);
    })
    app.post('/orders',async(req,res)=>{
        const order = req.body;
        const result =await orderCollection.insertOne(order)
        res.send(result);
    })
    app.post('/reviews',async(req,res)=>{
        const review = req.body;
        console.log(review);
        const result = await revoewCollection.insertOne(review);
        res.send(result);

    })
    app.get('/orders/:email',async(req,res)=>{
        const email = req.params.email;
        const query = {email:email};
        const cursor = orderCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    })
    app.patch('/orders/:id',async(req,res)=>{
        const id = req.params.id;
        const available = req.body.available;
        const filter = {_id:ObjectId(id)};
        const updateDoc ={
            $set:{
                available:available,
            }
        }
        const result =await partCollection.updateOne(filter,updateDoc);
        res.send(result)

    })

    app.put('/user/:email',async(req,res)=>{
        const email = req.params.email;
        const filter = {email:email};
        const options = {upsert : true};
        const updateDoc = {
            $set:{
                email:email
            }
        }
        const result =await userCollection.updateOne(filter,updateDoc,options)
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET);
        res.send({result,token});
    })

    
  } finally {

}
}
run().catch(console.dir);





app.get('/',(req,res)=>{
    res.send('hello from assignment twelve');
})
app.listen(port,()=>{
    console.log('listening to port',port);
})