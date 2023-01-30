//---------------------------------------------------------------------//
// File name: worker/index.js                                          //
// Description: fichero que establece la funcionalidad del worker para //
//              el proyecto 'Git executor Service'                     //
// Authors: Raúl Rodríguez Pérez                                       //
//          Gonzalo Iniesta Blasco                                     //
// Subject: SAD 2022/23                                                //
//---------------------------------------------------------------------//


// Imports de todos los paquetes necesarios                            
const Kafka = require('node-rdkafka')
const fs = require('fs')
const shell = require('shelljs')
const { once } = require('node:events')
const { createInterface } = require('node:readline')


//---------------------------------------------------------------------//
// Function name: sendJob                                              //
// Params: ID (String) - identificador del trabajo                     //
//         VALUE (Object) - información relativa al trabajo            //
// Definition: Envía información de un trabajo al topic de kafka       //
//             con el nombre "jobStatus".                              //
//---------------------------------------------------------------------//
function sendJob(ID, VALUE) {
    // Creamos el evento que vamos a enviar al topic
	const event = JSON.stringify({ JOB_ID: ID, VALUE: VALUE })
    
	// Abrimos el flujo de escritura para el topic - jobStatus
	const stream = Kafka.Producer.createWriteStream({
        'metadata.broker.list': 'localhost:9092'
	}, {}, { topic: 'jobStatus' });
    
	// Escibimos en el topic nuestro evento
    const success = stream.write(event)
    
	// Comprobamos si ha tenido éxito la escritura
    if (success){
        console.log('Message wrote successfully to the jobStatus topic')
    }else{
        console.log('Something went wrong with the write in jobStatus topic')
    }
}


//---------------------------------------------------------------------//
// Function name: isFileEmpty                                          //
// Params: fileName (String) - nombre del fichero                      //
//         ignoreWhitespace (True/False) - si el valor es true, ignora //
//                                         los espacios en blanco, si  //
//                                         es falso, no.               //
// Definition: Comprueba que el fichero pasado como parámetro esté     //
//             vacío o no                                              //                                                                   //
// Return: Devuelve una promesa cuyo valor será true - si el fichero   //
//         esta vacío, y false - si no                                 //
//---------------------------------------------------------------------//
function isFileEmpty(fileName, ignoreWhitespace=true) {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, (err, data) => {
            if( err ) {
                reject(err);
                return;
            }

            resolve((!ignoreWhitespace && data.length == 0) || (ignoreWhitespace && !!String(data).match(/^\s*$/)))
        });
    })
}


//---------------------------------------------------------------------//
// Function name: checkFileExists                                      //
// Params: filepath (String) - ruta del fichero                        //
// Definition: Comprueba que el fichero pasado como parámetro exista   //
//             o no                                                    //                                                                  
// Return: Devuelve una promesa cuyo valor será true - si el fichero   //
//         existe, y false - si no existe                              //
//---------------------------------------------------------------------//
function checkFileExists(filepath){
    return new Promise((resolve, reject) => {
      fs.access(filepath, fs.constants.F_OK, error => {
        resolve(!error);
      });
    });
}


//---------------------------------------------------------------------//
// Function name: readFile                                             //
// Params: filepath (String) - ruta del fichero                        //
// Definition: Lee un fichero dado y devuelve su contenido             //                                                                  
// Return: Devuelve una promesa cuyo valor será el contenido del       //
//         fichero, o los datos de error si ocurre alguno              //
//---------------------------------------------------------------------//
function readFile(filePath) {
    return new Promise( (resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if( err ) {
                reject(err);
                return;
            }
            resolve(data)
        });
    });
}


//---------------------------------------------------------------------//
// Function name: readFileLineByLine                                   //
// Params: filepath (String) - ruta del fichero                        //
// Definition: Lee y almacena el contenido línea por línea en un       //
//             vector                                                  //                                                                  //
// Return: Devuelve una promesa cuyo valor contendrá un vector cuyos   //
//         valores tendrán el contenido de cada línea del archivo, o   //
//         los datos de error si ocurre alguno                         //
//---------------------------------------------------------------------//
function readFileLineByLine(filePath) {
    return new Promise( async (resolve, reject) => {
        contentFile = []
        const rl = createInterface({
            input: fs.createReadStream(filePath),
            crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
            contentFile.push(line)
        });

        await once(rl, 'close');
        resolve(contentFile)
    });
}


//---------------------------------------------------------------------//
// Function name: KafkaConsumer                                        //
// Definition: Establece la conexión del worker al topic "jobQueue", y //
//             se pone a escuchar hasta que se realiza alguna          //
//             modificación en dicho topic. Tras esto el worker        //
//             procede a leer la info escrita en el topic y ejecutar   //
//             el trabajo propuesto                                    //
//---------------------------------------------------------------------//
var consumer = new Kafka.KafkaConsumer({'group.id': 'kafka','metadata.broker.list': 'localhost:9092',}, {});
consumer.connect();
consumer.on('ready', () => {
    console.log('Worker ready...')
    consumer.subscribe(['jobQueue'])
    consumer.consume();
}).on('data', async (data) => {
    const event = JSON.parse(data.value)
    const git_user = event.JOB_INFO.GIT_USERNAME
    const git_repo = event.JOB_INFO.GIT_REPO_NAME
    const repoPath = `${git_user}/${git_repo}`
    const filesPath = [event.JOB_INFO.DEPENDENCE_FILE_PATH, event.JOB_INFO.EXEC_FILE_PATH, event.JOB_INFO.PARAMS_FILE_PATH]
    let jobResult = ""
    let paramFile = ""

    // Actualizamos el estado del trabajo a 'En proceso'
    sendJob(event.JOB_ID, "En proceso")

    // Comprobamos si el repositorio que nos han pasado existe
    shell.exec(`git ls-remote "https://raulrguez09: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@github.com/${repoPath}.git" >> existeRepo.txt`)
    try {
        if(fs.existsSync('./existeRepo.txt')){
            // Comprobamos si el archivo está vacio
            let isEmpty = await isFileEmpty('./existeRepo.txt')
            shell.exec("rm -rf existeRepo.txt")

            // Si esta vacio, el repositorio no existe
            if(isEmpty === true){
                jobResult = ` repository https://github.com/${repoPath}.git not found`
                throw new Error(jobResult)
            }else{
                // Si NO esta vacio, continuamos nuestra labor clonando el repositorio
                shell.exec(`git clone "https://raulrguez09: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@github.com/${repoPath}.git"`)

                // Comprobamos que existan los archivos dentro del repositorio clonado
                var errorCheckFiles = ""
                for(var i = 0; i < filesPath.length; i++){
                    if(filesPath[i]){
                        var exist = await checkFileExists(filesPath[i])
                        if (!exist){
                            var pathError = `${filesPath[i]}`
                            errorCheckFiles = errorCheckFiles + pathError
                        }
                    }
                }

                // Si la variable no está vacía, significa que algún archivo no existe
                if(errorCheckFiles != ""){
                    jobResult = errorCheckFiles + ` not found in repository https://github.com/${repoPath}.git`
                    throw new Error(jobResult)
                }

                // Tras las comprobaciones, instalamos las dependencias necesarias para el trabajo
                if(filesPath[0]){
                    dependencies = await readFileLineByLine(filesPath[0])
                    for(var i = 0; i < dependencies.length; i++){
                        var child = shell.exec(`pip install ${dependencies[i]}`)
                        if(child.code !== 0){
                            jobResult = `Error: error in the installation of the package: ${dependencies[i]} \n` + child.stderr
                            throw new Error(jobResult)
                        }
                    }
                }

                // Guardamos los parametros de la funcion a ejecutar en una variable
                if(filesPath[2]){
                    paramFile = await readFile(filesPath[2])
                    paramFile = paramFile.replace(/(\r\n|\n|\r)/gm, "");
                }

                // Ejecutamos el EXEC_FILE (con los parametros si existen)
                if(filesPath[1]){
                    var child2 = shell.exec(`python3 ${filesPath[1]} ${paramFile}`)
                    if(child2.code !== 0){
                        jobResult = `Error: error in the execution of the file: ${filesPath[1]} \n` + child2.stderr
                        throw new Error(jobResult)
                    }
                    jobResult = child2.stdout
                }

                // Una vez ejecutamos el trabajo, desinstalamos las dependencias
                if(filesPath[0]){
                    for(var i = 0; i < dependencies.length; i++){
                        shell.exec(`pip uninstall -y ${dependencies[i]}`)
                    }
                }
            }
        }
    } catch (e) {
        console.log(e)
    }
    
    //Terminada la ejecución, borramos los archivos no necesarios
    shell.exec(`rm -rf ${git_repo}`)
    
    // Finalmente enviamos el trabajo con el resultado obtenido
    sendJob(event.JOB_ID, jobResult)
})