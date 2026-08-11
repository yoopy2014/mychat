const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  let currentRoom = '';
  let currentUser = '';

  // ルーム参加（または切り替え）
  socket.on('join_room', ({ roomId, username }) => {
    // 既に別のルームにいた場合は旧ルームから退室通知
    if (currentRoom && currentRoom !== roomId) {
      socket.leave(currentRoom);
      io.to(currentRoom).emit('receive_message', {
        id: Date.now(),
        author: 'システム',
        message: `${username} が退室しました。`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    currentRoom = roomId;
    currentUser = username;
    socket.join(roomId);

    // 新しいルームに新メンバー参加通知
    io.to(roomId).emit('receive_message', {
      id: Date.now(),
      author: 'システム',
      message: `${username} が入室しました。`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  });

  // メッセージ送信（同ルーム内のみ）
  socket.on('send_message', (data) => {
    const messageData = {
      ...data,
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    io.to(data.roomId).emit('receive_message', messageData);
  });

  // 入力中ステータス通知（同ルーム内のみ）
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('user_typing', { isTyping });
  });

  // 切断時
  socket.on('disconnect', () => {
    if (currentRoom && currentUser) {
      io.to(currentRoom).emit('receive_message', {
        id: Date.now(),
        author: 'システム',
        message: `${currentUser} が切断しました。`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
