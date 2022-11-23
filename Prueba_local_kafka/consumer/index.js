console.log("Consumer...")
import Kafka from 'node-rdkafka'
import eventType from '../eventType.js';

var consumer = new Kafka.KafkaConsumer({
    'group.id': 'kafka',
    'metadata.broker.list': 'localhost:9092',
  }, {});

consumer.connect();

consumer.on('ready', () => {
    console.log('Consumer ready...')
    // Podemos subscribirnos a mas de un topic, añadimos al array el nombre
    consumer.subscribe(['test'])
    consumer.consume();
}).on('data', (data) => {
    console.log(`received message: ${eventType.fromBuffer(data.value)}`);
    // const res = eventType.toJSON(data.value)
    // console.log(`Mi objeto json: ${JSON.stringify(res)}`)
})