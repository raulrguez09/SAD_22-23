import Kafka from 'node-rdkafka'
import eventType from '../eventType.js';
import fs from 'fs/promises'
import express from 'express'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid';

console.log("Producer...")
const app = express();
app.use(express.json());

let jobs = []
let jobsStatus = new Map()
let jobsResult = new Map()

var consumerStatus = new Kafka.KafkaConsumer({'group.id': 'kafka','metadata.broker.list': 'localhost:9092',}, {});
consumerStatus.connect()
consumerStatus.on('ready', () => {
    console.log('ConsumerStatus ready...')
    consumerStatus.subscribe(['jobStatus', 'jobResults'])
    consumerStatus.consume();
}).on('data', (data) => {
    const event = eventType.fromBuffer(data.value)
    var message = JSON.parse(event)
	if(message.TYPE == 'sendStatusJob'){
		console.log("Actualizamos el estado...")
		jobsStatus.set(message.ID, message.VALUE)
	}else if(message.TYPE == 'sendResultJob'){
		console.log("Actualizamos el resultado...")
	 	jobsResult.set(message.ID, message.VALUE)
	}
})

function sendJob(ID, URL) {
	// Creamos el evento que vamos a enviar
	const event = { ID: ID, TYPE: "sendJob", VALUE: URL }

	// Abrimos el flujo de escritura para el topic - test
	const stream = Kafka.Producer.createWriteStream({
		'metadata.broker.list': 'localhost:9092'
	}, {}, { topic: 'jobQueue' });

	// Escibimos en el topic nuestro evento
    const success = stream.write(eventType.toBuffer(event))
    //const success = stream.write(Buffer.from('hi pepi'))

	// Comprobamos si ha tenido éxito la escritura
    if (success){
        console.log('job message wrote successfully to the stream...')
    }else{
        console.log('Something went wrong with the write stream of the job...')
    }
}

function readStatus(ID, STATUS) {

}

app.get("/sendJob/:id", async (req, res) => {
	const ID = uuidv4()
    const URL = req.params.id
	jobs.push({'ID' : ID, 'URL' : URL})
	sendJob(ID, URL)
	jobsStatus.set(ID, "En cola")

	res.json({
		id: ID,
        url: URL
	})
})

app.get("/status/:id",  async (req, res) => {
	const ID = req.params.id
	if(!jobsStatus.get(ID)){
		return res.sendStatus(400);
	}else{
		return res.status(201).json(Object.fromEntries(jobsStatus))
	}
})

app.get("/result/:id", async (req, res) => {
	const ID = req.params.id
	if(!jobsResult.get(ID)){
		return res.sendStatus(400);
	}else{
		return res.status(201).json(Object.fromEntries(jobsResult))
	}

});

app.get("/showJobs", async (req, res) => {
	if (!jobs) {
		return res.sendStatus(400);
	}else{
		return res.status(201).json(jobs)
	}
});



app.listen(3000, () => console.log("API Server is running..."));