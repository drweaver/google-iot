'use strict';

const google = require('googleapis');
const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';
const _ = require('underscore');
const config = require('./etc/config.json');

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

exports.getDeviceState = function (request, response) {
    if( _.isUndefined( request.body.authKey ) || 
        request.body.authKey !== config.authKey ) {
        return response.status(403).end();
    }

    if(  ! _.has( request.body, 'deviceId' ) ) {
        console.log('No deviceId found in request', request.body);
        return response.status(401).end();
    }
    
    var client, auth;
    var message = { deviceId: request.body.deviceId };

    console.log('Starting getClient ' , Date.now());
    getClient()
        .then(c => {
            console.log('Starting getAuth ', Date.now());
            client = c;
            return getAuth();
        }).then(a => {
            console.log('Starting getDevice ', Date.now());
            auth = a;
            return getDevice(client, auth, generateDeviceName(message.deviceId));
        }).then(device => {
            var state = '';
            if( !_.isUndefined(device.state.binaryData) &&  !_.isEmpty(device.state.binaryData)) {
                state = new Buffer(device.state.binaryData, 'base64').toString();
                try {
                    state = JSON.parse(state);
                } catch(err) {
                    //NOOP - state is plain text
                }
            }
            console.log(`State successfully retrieved for device ${message.deviceId} with updateTime ${device.state.updateTime}`, state );
            response.status(200).send({ payload: state, updateTime: device.state.updateTime });
        }).catch(err => {
            console.error('Failed to get data from device:', err);
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