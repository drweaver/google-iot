# HomeHub

Hub running on home network to relay messges to and from Google IoT from local MQTT service.

## Concept

* Devices communicate with a local MQTT service - thus can be controlled/monitored on local network only
* This hub integrates local MQTT with Google IoT - now can be controlled/monitored via internet

## Setup

Create set of public/private keys as described on Google IoT:

```sh
cd etc
openssl req -x509 -newkey rsa:2048 -keyout rsa_private.pem -nodes \
    -out rsa_public.pem -subj "/CN=unused"
```

Create the device in Google IoT Core console and upload the public key (rsa_public.pem) as shown in IoT tutorial.

Rename etc/config.example.json to etc/config.json and update values

In the message_type field put in 'events' for telemetry (something you cannot control like temperature) 
or 'state' for device state (something you want to control like lights).

## Run

```sh
node index.js
```

### Device Config messages

Example expected format:

```json
{ 
    "payload": "on", 
    "timestamp": 1511630008593, 
    "messageId": "some-unique-id-e-g-from-uuid" 
}
```

messageId are used to ensure a message doesn't get re-published, they are kept for maximum 1 hour.

If timestamp is within 30s of Date.now() the message will be posted to the local MQTT service.