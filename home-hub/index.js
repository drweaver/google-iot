'use strict';
const iot = require('./lib/google-iot.js');
const config = require('./etc/config.json');
const _ = require('underscore');

const iotClient = iot.connect(config);


const mqtt = require('mqtt');

const client = mqtt.connect(config.local_mqtt_url);

client.subscribe('home/#');

client.on('message', (topic, msg)=>{
    console.log('MQTT Message:', topic +' '+ msg);
    if( topic.endsWith('/set') ) {
        console.log('Ignoring set message');
        return;
    }
    iot.publishEvent(topic, msg);
});

client.on('connect', ()=>{
    console.log('MQTT Successfully connected');
});



var messageLog = new Map();

iotClient.on('message', (topic, msg) => {
    if( _.isUndefined(msg) || _.isEmpty(msg) )
        return;
    try {
        _.each( JSON.parse(msg), (config, key) => {
            console.log('Message from IoT: ', config);
            let timestamp = new Date(config.timestamp).getTime();
            let now = Date.now();
            let diff = Math.round((now - timestamp)/1000);
            console.log(`Timestamp is ${timestamp}ms, now is ${now}ms, diff is ${diff}s`);
            if( messageLog.has(config.messageId) ) {
                console.log('Config already applied with messageId '+config.messageId);
                return;
            }
            if( diff > 60 ) {
                console.log(`Config stale, ${diff}s old`);
                return;
            }
            client.publish(config.topic, config.data);
            messageLog.set(config.messageId, config);
        });
    } catch(e) {
        console.error('Failed to process config message: ', msg);
    }
    // clear out old messages
    let hourOld = Date.now() - 360000;
    _.each( messageLog, (config,id) => {
        if( new Date(config.timestamp).getTime() < hourOld ) {
            messageLog.delete(id);
        }
    });
});