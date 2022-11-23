console.log("Producer...")
import Kafka from 'node-rdkafka'
import eventType from '../eventType.js'

const stream = Kafka.Producer.createWriteStream({
    'metadata.broker.list': 'localhost:9092'
  }, {}, { topic: 'test' });

function queueMessage() {
    const event = { ID: '1234', URL: 'www.pepe.com' }
    const success = stream.write(eventType.toBuffer(event))
    if (success){
        console.log('Message wrote successfully to the stream...')
    }else{
        console.log('Something went wrong with the write stream...')
    }
}

setInterval(() => {
    queueMessage()
}, 3000);