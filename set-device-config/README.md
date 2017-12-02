### Example request message

Example format which should be posted to the google function HTTP endpoint:

```json
{ 
    "authKey": "guid-as-defined-in-etc/config.json", 
    "message": { 
        "home/socket/1/set": { "topic": "home/socket/1/set", "data": "on" }, 
        "home/socket/2/set": { "topic": "home/socket/2/set", "data": "on" }, 
        "home/socket/3/set": { "topic": "home/socket/3/set", "data": "on" } 
    } 
}
```

* a timestamp parameters is added to each message when sent to device