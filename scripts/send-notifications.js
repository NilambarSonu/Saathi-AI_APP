/**
 * SAATHI AI - Push Notification Broadcast Script
 * 
 * This script demonstrates how to send a push notification to all registered users
 * using the Expo Push API. In a production environment, this logic would live
 * in your backend server (Node.js/Python/Go).
 * 
 * Requirements:
 * 1. A list of Expo Push Tokens (saved in your database from the app)
 * 2. `expo-server-sdk` installed: `npm install expo-server-sdk`
 */

const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
let expo = new Expo();

/**
 * Sends a notification to a list of tokens
 * @param {string[]} pushTokens Array of Expo Push Tokens
 * @param {string} title Notification Title
 * @param {string} body Notification Body
 * @param {Object} data Custom data to send (deep linking, ids, etc)
 */
async function sendBroadcast(pushTokens, title, body, data = {}) {
  let messages = [];
  
  for (let pushToken of pushTokens) {
    // Check that all your push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }

    // Construct a message (see https://docs.expo.io/push-notifications/sending-notifications/)
    messages.push({
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      channelId: 'default', // Matches the channel created in src/services/notifications.ts
    });
  }

  // The Expo push notification service accepts batches of notifications.
  // We recommend using chunks to stay under the 100kb limit.
  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];

  (async () => {
    for (let chunk of chunks) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Ticket Chunk:', ticketChunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }
    
    // NOTE: After sending, you should check the tickets for errors (like 'DeviceNotRegistered')
    // and remove those tokens from your database.
    console.log('Broadcast complete. Sent to', tickets.length, 'recipients.');
  })();
}

// EXAMPLE USAGE:
/*
const tokens = ['ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]', 'ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]'];
sendBroadcast(
  tokens, 
  'Morning Update 🌦️', 
  'Your soil moisture is looking good! Tap to see detailed insights.', 
  { screen: 'history', type: 'insight' }
);
*/

module.exports = { sendBroadcast };
