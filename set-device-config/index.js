'use strict';

const google = require('googleapis');
const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';
const _ = require('underscore');
const config = require('./etc/config.json');
const uuid = require('uuid/v4');

const getClient = () => new Promise((resolve, reject) => {
    const discoveryUrl = `${DISCOVERY_API}?version=${API_VERSION}`;
    google.discoverAPI(discoveryUrl, {}, (err, client) => {
        if (err) {
            console.log(`getClient ERR ${err}`);
            reject(err);
        }
        resolve(client);
    });
});

const getAuth = () => new Promise((resolve, reject) => {
    google.auth.getApplicationDefault((err, authClient) => {
        if (err) {
            console.log(`getAuthClient ERR ${err}`)
            reject(err);
        }
        if (authClient.createScopedRequired && authClient.createScopedRequired()) {
            authClient = authClient.createScoped(['https://www.googleapis.com/auth/cloud-platform']);
        }
        resolve(authClient);
    });
});

const getDevice = (client, auth, deviceName) => new Promise((resolve, reject) => {
    const requestDevice = {
        name: deviceName,
        auth: auth
    };
    client.projects.locations.registries.devices.get(requestDevice, (err, device) => {
        if (err) {
            console.log(`getDevice ERR ${err}`);
            reject(err);
        }
        resolve(device);
    });
});

const sendDataToDevice = (client, auth, device, deviceName, message) => new Promise((resolve, reject) => {
    const body = {
        versionToUpdate: device.config.version,
        binaryData: Buffer.from(message).toString('base64')
    };

    const req = {
        name: deviceName,
        resource: body,
        auth: auth
    };

    client.projects.locations.registries.devices.modifyCloudToDeviceConfig(req, (err, data) => {
        if (err) {
            console.log(`sendDataToDevice ERR ${deviceName} : ${err}`);
            reject(err);
        } else {
            console.log(`Configured device ${deviceName} : ${data}`);
            resolve(data);
        }
    });
});

var delay = timeout => new Promise( res => {
    setTimeout(() => {
        res();
    }, timeout);
});

var RetryPromise = (promise, timeout, times) => {
    return promise()
        .catch(error=>{
            console.error(`Failed, retries left = ${times}`, error);
            if( times === 0 ) 
                throw new Error(`${error} after all retries`);
            return delay(timeout)
                .then(() => RetryPromise(promise, timeout, times -1 ));
        });
};

exports.SendSomethingToDevice = function (request, response) {
    if( _.isUndefined( request.body.authKey ) || 
        _.isUndefined( request.body.message ) || 
        request.body.authKey !== config.authKey ) {
        return response.status(403).end();
    }

    // assume all is good, don't make the client wait to give response 
    response.status(200).send('OK - data will be sent to device'); 

    var message = request.body.message;
    _.each( message, value => {
        value.timestamp = new Date().toJSON();
        value.messageId = uuid();
    });
    
    const parentName = `projects/${config.projectId}/locations/${config.cloudRegion}`;
    const registryName = `${parentName}/registries/${config.registryId}`;
    const deviceName = `${registryName}/devices/${config.deviceId}/`;
    
    var client, auth;

    getClient()
        .then(c => {
            client = c;
            return getAuth();
        }).then(a => {
            auth = a;
            return RetryPromise( ()=> {
                return getDevice(client, auth, deviceName)
                    .then(device => {
                        console.log('Existing device config: ', device.config);
                        var buf = new Buffer( device.config.binaryData, 'base64');
                        var msg = message;
                        if( buf.length > 0 ) {
                            var prevMessage = JSON.parse(buf.toString());
                            msg = Object.assign(prevMessage, message);
                        }
                        console.log('data = ', msg);
                        return sendDataToDevice(client, auth, device, deviceName, JSON.stringify(msg));
                    });
            }, 50, 10);
        }).then(result => {
            console.log('Data successfully sent to device: ', result);
        }).catch(err => {
            console.error('Failed to send data to device: ', err);
        });
    return;
};