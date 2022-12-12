import Kafka from 'node-rdkafka'
import fs from 'fs/promises'
import express from 'express'
import _ from 'lodash'
import { v4 as uuidv4 } from 'uuid';

console.log("Producer...")
const app = express();
app.use(express.json());

let jobs = []
let jobsStatus = new Map()

var consumerStatus = new Kafka.KafkaConsumer({'group.id': 'kafka','metadata.broker.list': 'localhost:9092',}, {});
consumerStatus.connect()
consumerStatus.on('ready', () => {
    console.log('ConsumerStatus ready...')
    consumerStatus.subscribe(['jobStatus'])
    consumerStatus.consume();
}).on('data', (data) => {
    const event = JSON.parse(data.value)
	console.log("Actualizamos el estado...")
	jobsStatus.set(event.ID, event.VALUE)
})

function sendJob(ID, URL) {
	// Creamos el evento que vamos a enviar
	const event = JSON.stringify({ ID: ID, VALUE: URL })

	// Abrimos el flujo de escritura para el topic - test
	const stream = Kafka.Producer.createWriteStream({
		'metadata.broker.list': 'localhost:9092'
	}, {}, { topic: 'jobQueue' });

	// Escibimos en el topic nuestro evento
    const success = stream.write(event)
    //const success = stream.write(Buffer.from('hi pepi'))

	// Comprobamos si ha tenido éxito la escritura
    if (success){
        console.log('Job message wrote successfully to the stream...')
    }else{
        console.log('Something went wrong with the write stream of the job...')
    }
}

app.post("/sendJob/", async (req, res) => {
	// Ejemplo de entrada del body
	/*{
		// Keycloak
		"ACCESS_TOKEN":
		
		// Ejecucion git
		"GIT_REPO_URL":
		"EXEC_PATH":
		"PARAMS":
		"PARAMS_FILE_PATH":

		// Return data
		"RES_FILE_PATH": 
		"EMAIL":		
	}*/
	const ID = uuidv4()
	const URL = req.body.URL
	
	if (!URL) {
		return res.sendStatus(400);
	}

	jobs.push({'ID' : ID, 'URL' : URL})
	sendJob(ID, URL)
	jobsStatus.set(ID, "En cola")

	res.status(201).json({
		id: ID,
		url: URL
	})	
})

app.get("/status/:idJob",  async (req, res) => {
	const ID = req.params.idJob
	if(!jobsStatus.get(ID)){
		return res.sendStatus(400);
	}else{
		return res.status(201).json({
			ID: ID,
			Status: jobsStatus.get(ID)
		})
	}
})

app.get("/result/:idJob", async (req, res) => {
	const ID = req.params.idJob
	var result = jobsStatus.get(ID)
	if(!result || result == "En cola" || result == "En proceso"){
		return res.sendStatus(400);
	}else{
		return res.status(201).json({
			ID: ID,
			Status: jobsStatus.get(ID)
		})
	}
});

app.get("/showSendJobs", async (req, res) => {
	if (!jobs) {
		return res.sendStatus(400);
	}else{
		return res.status(201).json(jobs)
	}
});

app.listen(3000, () => console.log("API Server is running..."));