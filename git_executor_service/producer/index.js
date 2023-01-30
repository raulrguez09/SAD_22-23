//---------------------------------------------------------------------//
// File name: producer/index.js                                        //
// Description: fichero que establece la funcionalidad del frontend    //
//              para el proyecto 'Git executor Service'                //
// Authors: Raúl Rodríguez Pérez                                       //
//          Gonzalo Iniesta Blasco                                     //
// Subject: SAD 2022/23                                                //
//---------------------------------------------------------------------//


// Imports de todos los paquetes necesarios 
const Kafka = require('node-rdkafka')
const fs = require('fs')
const express = require('express');
const { send } = require('process');
const { functionsIn } = require('lodash');

//Iniciamos un servidor con el uso del framework express
const app = express();
app.use(express.json());

// Creamos las variables globales necesarias
let jobs = new Map()
let jobsStatus = new Map()
let GLOBAL_JOB_ID = 0x0
//const keycloak = require('./config/keycloak-config.js').initKeycloak(memoryStore)

//---------------------------------------------------------------------//
// Function name: KafkaConsumer                                        //
// Definition: Establece la conexión al topic "jobStatus", y           //
//             se pone a escuchar hasta que se realiza alguna          //
//             modificación en dicho topic. Tras el suceso de alguna   //
//             escritura en el topic, se procede a leer la info        //
//             escrita y a modificar el estado del trabajo             //
//---------------------------------------------------------------------//
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


//---------------------------------------------------------------------//
// Function name: checkJobExistence                                    //
// Params: ID (String) - identificador del trabajo                     //
//         ID_MAP (Map) - mapa que almacena los ID's de los trabajos   //
//                        actuales                                     //
// Definition: Funcion que comprueba la existencia de un trabajo, dado //
//             dado su identificador                                   //
// Return: Devuelve un booleano cuyo valor será true - cuando el       //
//         trabajo exista o haya existido, y false - cuando el trabajo //
//         no exista, ni haya existido                                 //
//---------------------------------------------------------------------//
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


//---------------------------------------------------------------------//
// Function name: sendJob                                              //
// Params: JOB_ID (String) - identificador del trabajo                 //
//         JOB_INFO (Object) - información relativa al trabajo         //
// Definition: Envía información de un trabajo al topic de kafka       //
//             con el nombre "jobQueue".                               //
//---------------------------------------------------------------------//
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

function checkPrevJobs(USERNAME){
	var result = []
	
	if(jobs.get(USERNAME)){
		var jobsSended = jobs.get(USERNAME)

		for(var i = 0; i <= jobsSended.length -1; i++){
			var jobID = jobsSended[i].JOB_ID
			var estado = jobsStatus.get(jobID)

			if(estado != undefined && estado != "En cola" && estado != "En proceso"){
				result.push({"USERNAME" : USERNAME, "JOB_ID" : jobID, "RESULT" : estado})
				jobsStatus.delete(jobID)
			}
		}
	}

	return result
}

app.post("/sendJob/", async (req, res) => {
	// Ejemplo de entrada del body
	/*{
		"JOB_INFO" : {
						"GIT_USERNAME": "",
						"GIT_REPO_NAME": "",
						"DEPENDENCE_FILE_PATH": "",
						"EXEC_FILE_PATH": "",
						"PARAMS_FILE_PATH": ""
					}
	}*/

	// Deserializamos el token, y obtenemos los datos del usuario
	//jvar TOKEN = GetToken(req.headers.authorization)
	//const USERNAME = TOKEN.preferred_username
    //var EMAIL = TOKEN.email
	var USERNAME = "pepe"

	// Comprobamos que hayan res de trabajos previos sin leer
	var resultPrevJob = checkPrevJobs(USERNAME)
	
	// Asiganmos el identificador al nuevo trabajo y lo incrementamos
	var JOB_ID = GLOBAL_JOB_ID.toString(16)
	GLOBAL_JOB_ID++

	// Obtenemos los parametros necesarios para la ejecución del trabajo
 	const JOB_INFO = req.body.JOB_INFO

	if(jobs.get(USERNAME)){
		var sended_jobs = jobs.get(USERNAME)
		var SEND_NEW_JOB = {'JOB_ID' : JOB_ID, 'JOB_INFO' : JOB_INFO }
		sended_jobs.push(SEND_NEW_JOB)
		jobs.set(USERNAME, sended_jobs)
	}else {
		var SEND_JOB = [{'JOB_ID' : JOB_ID, 'JOB_INFO' : JOB_INFO }]
		jobs.set(USERNAME, SEND_JOB)
	}
	
	// Enviamos el trabajo y lo añadimos a la cola
	sendJob(JOB_ID, JOB_INFO)
	jobsStatus.set(JOB_ID, "En cola")

	// Respondemos con la información sobre el usuario y el trabajo enviado
	if(resultPrevJob.length == 0){
		res.status(201).json({
			"JOB_INFO_ENVIADO" : {
				USERNAME: USERNAME,
				JOB_ID: JOB_ID,
				JOB_INFO: JOB_INFO
			}
		})	
	}else{
		res.status(201).json({
			"JOB_INFO_ENVIADO" : {
				USERNAME: USERNAME,
				JOB_ID: JOB_ID,
				JOB_INFO: JOB_INFO
			},
			"RES_PREVIOUS_JOB" : {
				resultPrevJob
			}
		})
	}
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