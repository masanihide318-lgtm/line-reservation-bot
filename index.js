const express = require('express');
const line = require('@line/bot-sdk');
const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);
const sessions = {};

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  let session = sessions[userId] || { step: 0 };
  const userMessage = event.message.text;

  switch (session.step) {
    case 0:
      if (userMessage.includes('予約したい')) {
        session.step = 1;
        sessions[userId] = session;
        return client.replyMessage(event.replyToken, { type: 'text', text: 'お名前を教えてください' });
      } else {
        return client.replyMessage(event.replyToken, { type: 'text', text: '「予約したい」と入力してください。' });
      }
    case 1:
      session.name = userMessage;
      session.step = 2;
      sessions[userId] = session;
      return client.replyMessage(event.replyToken, { type: 'text', text: session.name + 'さん、希望日時を教えてください' });
    case 2:
      session.date = userMessage;
      session.step = 3;
      sessions[userId] = session;
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'メニューを選んでください',
        quickReply: {
          items: [
            { type: 'action', action: { type: 'message', label: '60分', text: '60分' } },
            { type: 'action', action: { type: 'message', label: '90分', text: '90分' } },
            { type: 'action', action: { type: 'message', label: '120分', text: '120分' } },
          ],
        },
      });
    case 3:
      if (['60分', '90分', '120分'].includes(userMessage)) {
        session.menu = userMessage;
        var msg = '予約を承りました！\nお名前: ' + session.name + '\n日時: ' + session.date + '\nメニュー: ' + session.menu;
        delete sessions[userId];
        return client.replyMessage(event.replyToken, { type: 'text', text: msg });
      } else {
        return client.replyMessage(event.replyToken, { type: 'text', text: '60分、90分、または120分から選択してください。' });
      }
    default:
      delete sessions[userId];
      return client.replyMessage(event.replyToken, { type: 'text', text: '最初からやり直してください。「予約したい」と入力してください。' });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('listening on ' + port);
});
