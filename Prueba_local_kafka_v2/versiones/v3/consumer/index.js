console.log("Consumer...")
import Kafka from 'node-rdkafka'
import eventType from '../eventType.js';

function sendJob(ID, TYPE, VALUE, TOPIC) {
    // Creamos el evento que vamos a enviar
	const event = { ID: ID, TYPE: TYPE, VALUE: VALUE }
    
	// Abrimos el flujo de escritura para el topic - test
	const stream = Kafka.Producer.createWriteStream({
        'metadata.broker.list': 'localhost:9092'
	}, {}, { topic: TOPIC });
    
	// Escibimos en el topic nuestro evento
    const success = stream.write(eventType.toBuffer(event))
    //const success = stream.write(Buffer.from('hi pepi'))
    
	// Comprobamos si ha tenido éxito la escritura
    if (success){
        console.log('Message wrote successfully to the topic' + TOPIC + '...')
    }else{
        console.log('Something went wrong with the write in ' + TOPIC + '...')
    }
}

let consumerJobs = []

var consumer = new Kafka.KafkaConsumer({
    'group.id': 'kafka',
    'metadata.broker.list': 'localhost:9092',
  }, {});

consumer.connect();

consumer.on('ready', () => {
    console.log('Consumer ready...')
    // Podemos subscribirnos a mas de un topic, añadimos al array el nombre
    consumer.subscribe(['jobQueue'])
    consumer.consume();
}).on('data', async (data) => {
    //console.log(`received message: ${data.value}`);
    //console.log(`received message: ${eventType.fromBuffer(data.value)}`);
    const event = eventType.fromBuffer(data.value)
    consumerJobs.push(JSON.parse(event))
    console.log(consumerJobs)

    await new Promise(r => setTimeout(r, 10000));
    console.log("Actualizamos el estado del trabajo...")
    sendJob(consumerJobs[consumerJobs.length -1].ID, "sendStatusJob", "En proceso", 'jobStatus')
    
    console.log("Trabajamos...")
    await new Promise(r => setTimeout(r, 10000));

    console.log("Trabajo finalizado...")
    sendJob(consumerJobs[consumerJobs.length -1].ID, "sendStatusJob", "Finalizado", 'jobStatus')
    sendJob(consumerJobs[consumerJobs.length -1].ID, "sendResultJob", "MUY BIEN HE ACABADO", 'jobResults')
    
    // Enviamos que el trabajo esta en proceso
    // console.log("Tam vector: ")
    // console.log(consumerJobs.length)
    // console.log("Ultimo almacenado")
    // console.log(consumerJobs[consumerJobs.length -1].ID)
    //sendStatusJob()
    // console.log("Vector entero: ")
    // console.log(consumerJobs)
    // console.log("ID solo: ")
    // console.log(consumerJobs[0].ID)
    // console.log("URL solo: ")
    // console.log(consumerJobs[0].URL)
})
