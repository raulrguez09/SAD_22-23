// import Kafka from 'node-rdkafka'
// import fs from 'fs/promises'
// import express from 'express'
// import _ from 'lodash'
//import { v4 as uuidv4 } from 'uuid';
//import { Console } from 'console';

const Kafka = require('node-rdkafka')
const fs = require('fs')
const express = require('express')

console.log("Producer...")
const app = express();
app.use(express.json());

let jobs = new Map()
let GLOBAL_JOB_ID = 0x0
let jobsStatus = new Map()
//const keycloak = require('./config/keycloak-config.js').initKeycloak(memoryStore)

var consumerStatus = new Kafka.KafkaConsumer({'group.id': 'kafka','metadata.broker.list': 'localhost:9092',}, {});
consumerStatus.connect()
consumerStatus.on('ready', () => {
    console.log('ConsumerStatus ready...')
    consumerStatus.subscribe(['jobStatus'])
    consumerStatus.consume();
}).on('data', (data) => {
    const event = JSON.parse(data.value)
	console.log("Actualizamos el estado...")
	jobsStatus.set(event.JOB_ID, event.VALUE)
})

function checkJobExistence(ID, ID_MAP){
	var existe = false
	var limit = 0
	var listID = Array.from(ID_MAP.keys())

	if(listID.length != 0){
		for(var i = 0; i < listID.length && !existe; i++){
			if(ID.toString(16) < listID[i].toString(16) && ID.toString(16) >= limit.toString(16))
				existe = true
		}

		if(ID.toString(16) > listID[listID.length-1].toString(16) && ID.toString(16) < GLOBAL_JOB_ID.toString(16)){
			existe = true
		}
	}

	return existe
}

function sendJob(JOB_ID, JOB_INFO) {
	// Creamos el evento que vamos a enviar
	const event = JSON.stringify({ JOB_ID: JOB_ID, JOB_INFO: JOB_INFO })

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
		"KEYCLOAK" : {"ACCESS_TOKEN": ""},
		"JOB_INFO" : {
						"GIT_USERNAME": "",
						"GIT_REPO_NAME": "",
						"DEPENDENCE_FILE_PATH": "",
						"EXEC_FILE_PATH": "",
						"PARAMS_FILE_PATH": ""
					}
	}*/

	// Comprobamos el acceso a través de Keycloak
	const KEYCLOAK = req.body.KEYCLOAK
	const USERNAME = "pepe"

	// Asiganmos el identificador al nuevo trabajo y lo incrementamos
	var JOB_ID = GLOBAL_JOB_ID.toString(16)
	GLOBAL_JOB_ID++

	// Obtenemos los parametros necesarios para la ejecución del trabajo
 	const JOB_INFO = req.body.JOB_INFO
	
	var SEND_JOB = [{'JOB_ID' : JOB_ID, 'JOB_INFO' : JOB_INFO }]
	jobs.set(USERNAME, SEND_JOB)
	
	// Enviamos el trabajo y lo añadimos a la cola
	sendJob(JOB_ID, JOB_INFO)
	jobsStatus.set(JOB_ID, "En cola")

	// Respondemos con la información sobre el usuario y el trabajo
	res.status(201).json({
		USERNAME: USERNAME,
		JOB_ID: JOB_ID,
		JOB_INFO: JOB_INFO
	})
})

app.get("/status/:idJob",  async (req, res) => {
	const ID = req.params.idJob
	if(jobsStatus.get(ID)){
		return res.status(201).json({
			ID: ID,
			Status: jobsStatus.get(ID)
		})
	}else{
		if(checkJobExistence(ID, jobsStatus)){
			return res.status(201).json({
				ID: ID,
				Status: "Finalizado"
			})
		}else{
			return res.sendStatus(400);
		}
	}
})

app.get("/result/:idJob", async (req, res) => {
	const ID = req.params.idJob
	var result = jobsStatus.get(ID)

	if(result == undefined || result == "En cola" || result == "En proceso"){
		return res.sendStatus(400);
	}else{
		jobsStatus.delete(ID)
		console.log(jobsStatus.has(ID))
		return res.status(201).json({
			ID: ID,
			Status: result
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