const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' })); // 全ドメインからの接続を許可（本番運用時はドメイン制限を推奨）

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`ユーザー接続: ${socket.id}`);

  socket.on('join_room', (data) => {
    socket.join(data.roomId);
  });

  socket.on('send_message', (data) => {
    const payload = {
      ...data,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    };
    io.in(data.roomId).emit('receive_message', payload);
  });

  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('user_typing', data);
  });

  socket.on('disconnect', () => {
    console.log(`ユーザー切断: ${socket.id}`);
  });
});

// Renderなどのクラウド環境が割り当てるPORT番号に対応
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で起動しました`);
});