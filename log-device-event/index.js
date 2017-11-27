/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event The Cloud Functions event.
 * @param {!Function} The callback function.
 */
exports.logDeviceEvent = (event, callback) => {
  // The Cloud Pub/Sub Message object.
  const pubsubMessage = event.data;

  // We're just going to log the message to prove that
  // it worked.
  console.log(Buffer.from(pubsubMessage.data, 'base64').toString());
  console.log(pubsubMessage.attributes.subFolder);
  
  // Translate ready for storage
  const data = {
    topic: pubsubMessage.attributes.subFolder,
    data: Buffer.from(pubsubMessage.data, 'base64').toString(),
    time: event.timestamp
  };
  console.log(data);
  
  // Connect to datastore
  const datastore = require('@google-cloud/datastore')();
  const key = datastore.key('Event');
  const entity = {
    key: key,
    data: data 
  };
  // Upsert the data
  datastore.upsert(entity)
  .then(() => {
    // Task inserted successfully.
    callback();
  });
  
  // Don't forget to call the callback.
  //callback();
};
