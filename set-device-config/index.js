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

const sendDataToDevice = (client, auth, device, message) => new Promise((resolve, reject) => {
    const body = {
        versionToUpdate: device.config.version,
        binaryData: Buffer.from(message).toString('base64')
    };

    const req = {
        name: device.name,
        resource: body,
        auth: auth
    };

    client.projects.locations.registries.devices.modifyCloudToDeviceConfig(req, (err, data) => {
        if (err) {
            console.error(`sendDataToDevice ERR ${device.id} :`, err);
            reject(err);
        } else {
            console.log(`Configured device ${device.id} :`,  data);
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

exports.setDeviceConfig = function (request, response) {
    if( _.isUndefined( request.body.authKey ) || 
        request.body.authKey !== config.authKey ) {
        return response.status(403).end();
    }

    var messages = [];
    if( _.has( request.body, 'payload' ) && _.has( request.body, 'deviceId' ) ) {
        messages.push( { payload: request.body.payload, deviceId: request.body.deviceId }  );
    }

    if( _.has( request.body, 'messages' ) && _.isArray( request.body.messages ) ) {
        messages = messages.concat( 
            _.filter( request.body.messages, m=>{ return _.has( m, 'payload' ) && _.has( m, 'deviceId' ); } ) );
    }

    if( _.isEmpty( messages ) ) {
        console.log('No message data found in request', request.body);
        return response.status(401).end();
    }

    const timestamp = new Date().toJSON();
    _.each( messages, m=> {
        m.timestamp = timestamp;
        m.messageId = uuid();
    });
    
    var client, auth;

    console.log('Starting getClient ' , Date.now());
    getClient()
        .then(c => {
            console.log('Starting getAuth ', Date.now());
            client = c;
            return getAuth();
        }).then(a => {
            console.log('Starting getDevice ', Date.now());
            auth = a;

            return Promise.all(_.map( messages, message=> {
                return RetryPromise( ()=> {
                    return getDevice(client, auth, generateDeviceName(message.deviceId))
                        .then(device => {
                            console.log('New device config: ', message);
                            console.log('Starting sendDataToDevice ', Date.now());
                            return sendDataToDevice(client, auth, device, JSON.stringify(message));
                        });
                }, 50, 10);
            }));
        }).then(results => {
            console.log(`Data successfully sent to ${results.length} device(s)`);
            response.status(200).end();
        }).catch(err => {
            console.error('Failed to send data to device(s): ', err);
            response.status(500).end();
        });
    return;
};

function generateDeviceName( deviceId ) {
    const parentName = `projects/${config.projectId}/locations/${config.cloudRegion}`;
    const registryName = `${parentName}/registries/${config.registryId}`;
    const deviceName = `${registryName}/devices/${deviceId}/`;
    return deviceName;
}