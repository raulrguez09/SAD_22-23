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

function sendJob(ID, URL) {
	// Creamos el evento que vamos a enviar
	const event = { ID: ID, URL: URL }

	// Abrimos el flujo de escritura para el topic - test
	const stream = Kafka.Producer.createWriteStream({
		'metadata.broker.list': 'localhost:9092'
	}, {}, { topic: 'jobQueue' });

	// Escibimos en el topic nuestro evento
    const success = stream.write(eventType.toBuffer(event))
    //const success = stream.write(Buffer.from('hi pepi'))

	// Comprobamos si ha tenido éxito la escritura
    if (success){
        console.log('Message wrote successfully to the stream...')
    }else{
        console.log('Something went wrong with the write stream...')
    }

	// Añadimos el nuevo estado del trabajo
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

app.get("/estado/:id",  async (req, res) => {
	const ID = req.params.id
	if(!jobsStatus.get(ID)){
		return res.sendStatus(400);
	}else{
		return res.status(201).json(Object.fromEntries(jobsStatus))
	}

})

app.get("/showJobs", async (req, res) => {
	if (!jobs) {
		return res.sendStatus(400);
	}else{
		return res.status(201).json(jobs)
	}
});

app.listen(3000, () => console.log("API Server is running..."));