'use strict';

const jwt = require('jsonwebtoken');
const mqtt = require('mqtt');
const fs = require('fs');

function createJwt (projectId, privateKeyFile, algorithm) {
    // Create a JWT to authenticate this device. The device will be disconnected
    // after the token expires, and will have to reconnect with a new token. The
    // audience field should always be set to the GCP project id.
    const token = {
      'iat': parseInt(Date.now() / 1000),
      'exp': parseInt(Date.now() / 1000) + 20 * 60,  // 20 minutes
      'aud': projectId
    };
    const privateKey = fs.readFileSync(privateKeyFile);
    return jwt.sign(token, privateKey, { algorithm: algorithm });
}

exports.connect = config=>{
  
    // The mqttClientId is a unique string that identifies this device. For Google
    // Cloud IoT Core, it must be in the format below.
    const mqttClientId = `projects/${config.project_id}/locations/${config.cloud_region}/registries/${config.registry_id}/devices/${config.device_id}`;

    // console.log('mqttClientId',mqttClientId);
    // console.log('JWT', createJwt(config.project_id, config.private_key_file, config.algorithm));

    // With Google Cloud IoT Core, the username field is ignored, however it must be
    // non-empty. The password field is used to transmit a JWT to authorize the
    // device. The "mqtts" protocol causes the library to connect using SSL, which
    // is required for Cloud IoT Core.
    const connectionArgs = {
        host: 'mqtt.googleapis.com',
        port: 8883,
        clientId: mqttClientId,
        username: 'unused',
        password: createJwt(config.project_id, config.private_key_file, 'RS256'),
        protocol: 'mqtts'
    };
    
    // Create a client, and connect to the Google MQTT bridge.
    const client = mqtt.connect(connectionArgs);

    exports.publishEvent = (topic, payload)=>{
        console.log('google-iot Publishing message:', topic +' '+payload);
        // The MQTT topic that this device will publish data to. The MQTT
        // topic name is required to be in the format below. The topic name must end in
        // 'state' to publish state and 'events' to publish telemetry. Note that this is
        // not the same as the device registry's Cloud Pub/Sub topic.
        let mqttTopic = `/devices/${config.device_id}/events/${topic}`;
        client.publish(mqttTopic, payload, { qos: 0 });
    };

    client.subscribe(`/devices/${config.device_id}/config`);
    
    client.on('connect', () => {
        console.log('google-iot connect');
    });

    client.on('close', () => {
        console.log('google-iot close');
    });

    client.on('error', (e) => {
        console.log('google-iot error', e);
    });

    // client.on('packetsend', (p) => {
    //     console.log('packetsend', p);
    // });

    client.on('reconnect', () => {
        console.log('google-iot reconnect, refreshing password');
        client.options.password = createJwt(config.project_id, config.private_key_file, 'RS256');
        //console.log(client);
    });

    return client;
};