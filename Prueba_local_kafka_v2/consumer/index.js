console.log("Worker...")
import Kafka from 'node-rdkafka'

function sendJob(ID, VALUE) {
    // Creamos el evento que vamos a enviar
	const event = JSON.stringify({ ID: ID, VALUE: VALUE })
    
	// Abrimos el flujo de escritura para el topic - test
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

var consumer = new Kafka.KafkaConsumer({'group.id': 'kafka','metadata.broker.list': 'localhost:9092',}, {});
consumer.connect();
consumer.on('ready', () => {
    console.log('Consumer ready...')
    // Podemos subscribirnos a mas de un topic, añadimos al array el nombre
    consumer.subscribe(['jobQueue'])
    consumer.consume();
}).on('data', async (data) => {
    const event = JSON.parse(data.value)

    await new Promise(r => setTimeout(r, 40000));
    console.log("Actualizamos el estado del trabajo...")
    sendJob(event.ID, "En proceso")
    
    console.log("Trabajamos...")
    await new Promise(r => setTimeout(r, 10000));

    console.log("Trabajo finalizado...")
    sendJob(event.ID, "MUY BIEN HE ACABADO",)
})
