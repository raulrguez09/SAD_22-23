//---------------------------------------------------------------------//
// File name: producer/index.js                                        //
// Description: fichero que establece la funcionalidad del frontend    //
//              para el proyecto 'Git executor Service'                //
// Authors: Raúl Rodríguez Pérez                                       //
//          Gonzalo Iniesta Blasco                                     //
// Subject: SAD 2022/23                                                //
//---------------------------------------------------------------------//


// Imports de todos los paquetes necesarios
console.log("Starting producer...") 
const Kafka = require('node-rdkafka')
const express = require('express')
const session = require('express-session')
const jwt_decode = require('jwt-decode')

// Iniciamos un servidor con el uso del framework express
const app = express();
app.use(express.json());

// Almacenamos la informacion de la session de keycloak
const memoryStore = new session.MemoryStore();

app.use(session({
	secret: 'some secret',
	resave: false,
	saveUninitialized: true,
	store: memoryStore
}));

// Cargamos la configuración de Keycloak
let keycloak = require('./keycloak_config.js').initKeycloak(memoryStore)

// Creamos las variables globales necesarias
let jobs = new Map()
let jobsStatus = new Map()
let GLOBAL_JOB_ID = 0x0


//---------------------------------------------------------------------//
// Function name: KafkaConsumer                                        //
// Definition: Establece la conexión al topic "jobStatus", y           //
//             se pone a escuchar hasta que se realiza alguna          //
//             modificación en dicho topic. Tras el suceso de alguna   //
//             escritura en el topic, se procede a leer la info        //
//             escrita y a modificar el estado del trabajo             //
//---------------------------------------------------------------------//
var consumerStatus = new Kafka.KafkaConsumer({'group.id': 'kafka','metadata.broker.list': 'kafka',}, {});
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
		'metadata.broker.list': 'kafka'
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


//---------------------------------------------------------------------//
// Function name: checkPrevJobs                                        //
// Params: USERNAME (String) - nombre del usuario                      //
// Definition: Funcion que comprueba si el usuario dado por parametro  //
//             tiene trabajos finalizados que aun no ha visto. Si ese  //
//             es el caso, recopila y envía la información de dicho o  //
//             dichos trabajos.                                        //
// Return: Devuelve un vector con la informacion de los trabajos que   //
//         han finalizado y el usuario no ha visto, y en caso de que   //
//         no haya ningun trabajo, envia un vector vacio               //
//---------------------------------------------------------------------//
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


//---------------------------------------------------------------------//
// Function name: getDecodedToken                                      //
// Params: Token - access token de keycloak                            //
// Definition: Funcion que permite permite descodificar, verificar     //
//             y generar un token web JSON, a partir del access token  //
//             generado por Keycloak                                   //
// Return: Devuelve un token web JSON con toda la informacion          //
//         decodificada del access token                               //
//---------------------------------------------------------------------//
function getDecodedToken(token){
    var rawToken = token.toString().split(" ")
    var decodedToken = jwt_decode(rawToken[1], { payload: true });
    return decodedToken
}


//---------------------------------------------------------------------//
// Function name: API function - /sendJob                              //
// Type: POST                                                          //
// Definition: Función que comprueba la autenticación del usuario,     //
//             y si es aceptada, envia información referente a un      //
//             trabajo y la escribe en la cola kafka                   //
// Return: Devuelve, en formato JSON, información sobre el trabajo     //
//         enviado. Ademas, si hubieran trabajos finalizados           //
//         pendientes, se enviaria su informacion junto con sus        //
//         resultados                                                  //
//---------------------------------------------------------------------//
app.post("/sendJob/", keycloak.protect(process.env.KEYCLOAK_ROLE), async (req, res) => {
	// Deserializamos el token, y obtenemos los datos del usuario
	var TOKEN = getDecodedToken(req.headers.authorization)
	const USERNAME = TOKEN.preferred_username
    var EMAIL = TOKEN.email

	// Comprobamos que hayan res de trabajos previos sin leer
	var resultPrevJob = checkPrevJobs(USERNAME)
	
	// Asiganmos el identificador al nuevo trabajo y lo incrementamos
	var JOB_ID = GLOBAL_JOB_ID.toString(16)
	GLOBAL_JOB_ID++

	// Obtenemos los parametros necesarios para la ejecución del trabajo
 	const JOB_INFO = req.body.JOB_INFO

	// Añadimos el nuevo trabajo a nuestro mapa
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


//---------------------------------------------------------------------//
// Function name: API function - /status/:idJob                        //
// Type: GET                                                           //
// Definition: Función que dado el identificador de un trabajo,        //
//             devuelve el estado en el que se encuentra.              //
// Return: Devuelve en formato JSON el identificador del trabajo con   //
//         el estado asociado en ese momento, este puede ser: En cola, //
//         En proceso, Finalizado, o con el resultado del trabajo      //
//---------------------------------------------------------------------//
app.get("/status/:idJob", keycloak.protect(process.env.KEYCLOAK_ROLE),  async (req, res) => {
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


//---------------------------------------------------------------------//
// Function name: API function - /result/:idJob                        //
// Type: GET                                                           //
// Definition: Función que dado el identificador de un trabajo,        //
//             devuelve el resultado final del mismo. Una vez enviado  //
//             el reultado del trabajo, se borra del mapa.             //
// Return: Devuelve en formato JSON el ID del trabajo con el           //
//         resultado del mismo                                         //
//---------------------------------------------------------------------//
app.get("/result/:idJob", keycloak.protect(process.env.KEYCLOAK_ROLE), async (req, res) => {
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


//---------------------------------------------------------------------//
// Function name: API function - /showSendJobs                         //
// Type: GET                                                           //
// Definition: Función que devuelve la informacion de todos los        //
//             trabajos enviados por el usuario actual                 //
// Return: Devuelve en formato JSON un listado de los trabajos         //
//         enviados por el usuario actual                              //
//---------------------------------------------------------------------//
app.get("/showSendJobs", keycloak.protect(process.env.KEYCLOAK_ROLE), async (req, res) => {
	var TOKEN = getDecodedToken(req.headers.authorization)
	const USERNAME = TOKEN.preferred_username
	allJobs = jobs.get(USERNAME)
	if (!alljobs) {
		return res.sendStatus(400);
	}else{
		return res.status(201).json(jobs)
	}
});


app.listen(3000, () => console.log("API Server is running..."));