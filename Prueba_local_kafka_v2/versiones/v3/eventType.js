import avro from 'avsc';

export default avro.Type.forSchema({
    type: 'record',
    fields: [
        {
            name: 'ID',
            type: 'string'
        },
        {
            name: 'TYPE',
            type: 'string'
        },
        {
            name: 'VALUE',
            type: 'string'
        }
    ]
})