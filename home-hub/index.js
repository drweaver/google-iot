'use strict';
const iot = require('./lib/google-iot.js');
const config = require('./etc/config.json');
const _ = require('underscore');

const iotClient = iot.connect(config);

const mqtt = require('mqtt');

const client = mqtt.connect(config.local_mqtt_url);

client.subscribe(config.local_mqtt_sub);

client.on('message', (topic, msg)=>{
    console.log(`MQTT Message ${topic} ${msg}`);
    iot.publish(msg);
});

client.on('connect', ()=>{
    console.log('MQTT Successfully connected');
});

var messageLog = new Map();

iotClient.on('message', (topic, msg) => {
    if( _.isUndefined(msg) || _.isEmpty(msg) )
        return;
    try {
        var message = JSON.parse(msg);
        console.log('Message from IoT: ', message);
        let timestamp = new Date(message.timestamp).getTime();
        let now = Date.now();
        let diff = Math.round((now - timestamp)/1000);
        console.log(`Timestamp is ${timestamp}ms, now is ${now}ms, diff is ${diff}s`);
        if( messageLog.has(message.messageId) ) {
            console.log('Config already applied with messageId '+message.messageId);
            return;
        }
        if( diff < -30 ) {
            console.log('Config is in the future! Roads? where we\'re going we don\'t need roads!');
            return;
        }
        if( diff > 30 ) {
            console.log(`Config stale, ${diff}s old`);
            return;
        }
        client.publish(config.local_mqtt_pub, message.payload);
        messageLog.set(message.messageId, message);
    } catch(e) {
        console.error('Failed to process config message: ', msg);
    }
    // clear out old messages
    let hourOld = Date.now() - 360000;
    messageLog.forEach((message,id) => {
        if( new Date(message.timestamp).getTime() < hourOld ) {
            console.log('deleting old message from log', message);
            messageLog.delete(id);
        }
    });
    console.log(`messageLog size is now ${messageLog.size}`);
});
