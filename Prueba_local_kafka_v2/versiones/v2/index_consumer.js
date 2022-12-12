console.log("Consumer...")
import Kafka from 'node-rdkafka'
import eventType from '../eventType.js';

var consumer = new Kafka.KafkaConsumer({
    'group.id': 'kafka',
    'metadata.broker.list': 'localhost:9092',
  }, {});

consumer.connect();
consumer.subscribe(['jobQueue'])
// consumer.consume();
// consumer.on('data', (data) =>{console.log(`received message: ${eventType.fromBuffer(data.value)}`)})

await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
    console.log('Received message', {
        topic,
        partition,
        key: message.key.toString(),
        value: message.value.toString()})
    }
})

consumer.on('ready', async () => {
    console.log('Consumer ready...')
    // Podemos subscribirnos a mas de un topic, añadimos al array el nombre
    consumer.subscribe(['jobQueue'])
    consumer.consume();
    // await new Promise(r => setTimeout(r, 5000));
}).on('data', (data) => {
    //console.log(`received message: ${data.value}`);
    console.log(`received message: ${eventType.fromBuffer(data.value)}`);
    // const cosa = JSON.parse(data.value)
    // console.log(cosa) 
    
    // const res = eventType.toJSON(data.value)
    // console.log(`Mi objeto json: ${JSON.stringify(res)}`)
})

// const main = async () => {
//     await consumer.connect()

//     await consumer.subscribe(['jobQueue'])

//     await consumer.run({
//         eachMessage: async ({ topic, partition, message }) => {
//         console.log('Received message', {
//             topic,
//             partition,
//             key: message.key.toString(),
//             value: message.value.toString()})
//         }
//     })
// }

// main().catch(async error => {
//     console.error(error)
//     try {
//         await consumer.disconnect()
//     } catch (e) {
//         console.error('Failed to gracefully disconnect consumer', e)
//     }
//     process.exit(1)
// })
