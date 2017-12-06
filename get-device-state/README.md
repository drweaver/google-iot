### Example request message

Example format which should be posted to the google function HTTP endpoint:

Copy etc/config.example.json to etc/config.json and update as appropriate.

```json
{ 
    "authKey": "guid-as-defined-in-etc/config.json", 
    "deviceId": "device-name-from-cloud-iot"
}
```

Exmaple response:

```json
{ 
    "payload": "on",
    "updateTime": "2017-12-06T17:11:53.303759Z"
}
