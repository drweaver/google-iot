### Example request message

Example format which should be posted to the google function HTTP endpoint:

Multiple in a single request:
```json
{ 
    "authKey": "guid-as-defined-in-etc/config.json", 
    "messages": [
        { "deviceId": "device-name-from-cloud-iot", "payload": "on" },
        { "deviceId": "another-device-name", "payload": "off" }
    ]
}
```
or just a single update:
```json
{ 
    "authKey": "guid-as-defined-in-etc/config.json", 
    "deviceId": "device-name-from-cloud-iot", 
    "payload": "on"
}

* A timestamp and messageId parameter is added to each message when sent to device