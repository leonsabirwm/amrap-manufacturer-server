const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


//middlewares
app.use(cors());
app.use(express.json());

const verifyJWT = (req,res,next)=>{
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message:"Unauthorized Access"});
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(error, decoded) {
        if(error){
            return res.status(403).send({message:"Forbidden Access"});
        }
        req.decoded = decoded;
        console.log('jwt')
        next();
      });

}

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
    const reviewCollection = client.db('amrap').collection('reviews');

    const verifyAdmin =async (req,res,next)=>{
        const requester = req.decoded.email;
        const filter = {email : requester};
        const account = await userCollection.findOne(filter);
        if(account.role === "admin"){
            next();
        }
        else{
            res.status(403).send({message:"forbidden admin access only"});
        }
    }
    app.post('/create-payment-intent',async(req,res)=>{
        const order = req.body;
        const price = order.price;
        if(price){
        const amount = (price*100);
        const paymentIntent = await stripe.paymentIntents.create({
            amount : amount,
            currency: 'bdt',
            payment_method_types:['card']
          });
        console.log(paymentIntent.client_secret);
          res.send({clientSecret: paymentIntent.client_secret})
       }
    });


    app.get('/admin/:email',async(req,res)=>{
        const email = req.params.email;
        const filter = {email:email};
        const user = await userCollection.findOne(filter);
        if(user.role==="admin"){
            res.send({admin:true});
        }
        else{
            res.send({admin:false});
        }
    })
    app.post("/parts",async(req,res)=>{
        const product = req.body;
        const result = await partCollection.insertOne(product);
        res.send(result);
    })
    
    app.get("/parts",async(req,res)=>{
        const query = req.query;
        const cursor = partCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    })
    app.delete("/parts/:id",verifyJWT,verifyAdmin,async(req,res)=>{
        const id = req.params.id;
        const filter = {_id : ObjectId(id)};
        const result = await partCollection.deleteOne(filter);
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
    });
    app.patch('/order/:id',async(req,res)=>{
        const id = req.params.id;
        const filter = {_id:ObjectId(id)};
        const updateDoc = {
            $set:{
                payment:'true'
            }
        }
        const result = await orderCollection.updateOne(filter,updateDoc);
        res.send(result);
    })
    app.get('/order/:id',async(req,res)=>{
        const id = req.params.id;
        const filter = {_id:ObjectId(id)};
        const result = await orderCollection.findOne(filter);
        res.send(result);
    });
    app.patch('/order/proceed/:id',verifyJWT,verifyAdmin,async(req,res)=>{
        const id = req.params.id;
        const filter = {_id:ObjectId(id)};
        const updateDoc = {
            $set:{
                shipped:true,
            }
        }
        const result = await orderCollection.updateOne(filter,updateDoc);
        res.send(result);
    });
    app.get('/orders',verifyJWT,verifyAdmin,async(req,res)=>{
        const cursor =  orderCollection.find({});
        const result = await cursor.toArray();
        res.send(result);
    });
    app.get('/orders/:email',verifyJWT,async(req,res)=>{
        const email = req.params.email;
        const query = {email:email};
        const cursor = orderCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    });
    app.post('/reviews',verifyJWT,async(req,res)=>{
        const review = req.body;
        const result = await reviewCollection.insertOne(review);
        res.send(result);

    })
    app.get('/reviews',async(req,res)=>{
        const cursor = reviewCollection.find({});
        const result = await cursor.toArray();
        res.send(result);
    })
   
    app.delete('/orders/:id',async(req,res)=>{
        const id = req.params.id;
        const filter = {_id : ObjectId(id)};
        const result = await orderCollection.deleteOne(filter);
        res.send(result);

    })
    app.patch('/orders/:id',verifyJWT,async(req,res)=>{
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
    app.get('/users',verifyJWT,verifyAdmin,async(req,res)=>{
        const cursor = userCollection.find({});
        const result = await cursor.toArray();
        res.send(result);
    })

    app.put('/user/:email',async(req,res)=>{
        const email = req.params.email;
        const filter = {email:email};
        const name = req.body;
        const options = {upsert : true};
        const updateDoc = {
            $set:{
                email:email,
                name:name.name
            }
        }
        const result =await userCollection.updateOne(filter,updateDoc,options)
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET);
        res.send({result,token});
    })
    app.put("/user/admin/:email",verifyJWT,verifyAdmin,async(req,res)=>{
        const email = req.params.email;
        const filter = {email : email};
        const option = {upsert:true}
        const updateDoc = {
            $set:{
                role:"admin"
            }
        }
        const result = await userCollection.updateOne(filter,updateDoc,option);
        res.send(result);
    })
    app.patch('/users/update/:email',verifyJWT,async(req,res)=>{
        const email = req.params.email;
        const filter = {email:email};
        const options = {upsert : true};
        const updation = req.body;
        const updateDoc = {
            $set:{
                phone: updation.phone,
                address: updation.address,
                linkdin: updation.linkdin,
                education: updation.education
            }
        }
        const result =await userCollection.updateOne(filter,updateDoc,options)
        res.send(result);
    })
    app.get('/users/:email',async(req,res)=>{
        const filter ={email:req.params.email};
        const result =await userCollection.findOne(filter);
        // console.log(result);
        res.send(result);
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