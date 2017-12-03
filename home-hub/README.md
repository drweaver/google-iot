# HomeHub

Hub running on home network to relay messges to and from Google IoT from local MQTT service.

## Concept

* Devices communicate with a local MQTT service - thus can be controlled/monitored on local network only
* This hub integrates local MQTT with Google IoT - now can be controlled/monitored via internet

## Setup

Create set of public/private keys as described on Google IoT. 

Generate the device and upload the public key as shown in IoT tutorial.

Put the private key in etc/rsa_private.pem

Rename etc/config.example.json to etc/config.json and update values

## Run

```sh
node index.js
```

### Device Config messages

Example expected format:

```json
{ 
    "home/socket/1/set": { "topic": "home/socket/1/set", "data": "on", "timestamp": 1511630008593, "messageId": "a-uuid-1" }, 
    "home/socket/2/set": { "topic": "home/socket/2/set", "data": "on", "timestamp": 1511630008593, "messageId": "a-uuid-1" }, 
    "home/socket/3/set": { "topic": "home/socket/3/set", "data": "on", "timestamp": 1511630008593, "messageId": "a-uuid-1" }  
}
```

If timestamp is within 60s of Date.now() the message will be posted to the local MQTT service.