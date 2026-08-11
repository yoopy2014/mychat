const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());

// Supabase クライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

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

  // ルーム参加（過去ログの取得）
  socket.on('join_room', async ({ roomId, username }) => {
    if (currentRoom && currentRoom !== roomId) {
      socket.leave(currentRoom);
    }

    currentRoom = roomId;
    currentUser = username;
    socket.join(roomId);

    // Supabase から最新100件のログを取得
    if (supabase) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data) {
        const history = data.map((msg) => ({
          id: msg.id,
          roomId: msg.room_id,
          author: msg.author,
          message: msg.message,
          timestamp: msg.timestamp,
        }));
        socket.emit('load_history', history);
      } else {
        socket.emit('load_history', []);
      }
    } else {
      socket.emit('load_history', []);
    }

    // 入室通知
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const joinMsg = {
      id: Date.now(),
      roomId,
      author: 'システム',
      message: `${username} が入室しました。`,
      timestamp: timeStr,
    };

    if (supabase) {
      await supabase.from('messages').insert([
        { room_id: roomId, author: 'システム', message: `${username} が入室しました。`, timestamp: timeStr }
      ]);
    }

    io.to(roomId).emit('receive_message', joinMsg);
  });

  // メッセージ送信・保存
  socket.on('send_message', async (data) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageData = {
      ...data,
      id: Date.now(),
      timestamp: timeStr,
    };

    if (supabase) {
      await supabase.from('messages').insert([
        {
          room_id: data.roomId,
          author: data.author,
          message: data.message,
          timestamp: timeStr,
        },
      ]);
    }

    io.to(data.roomId).emit('receive_message', messageData);
  });

  // 入力中ステータス
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('user_typing', { isTyping });
  });

  // 切断処理
  socket.on('disconnect', async () => {
    if (currentRoom && currentUser) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const disconnectMsg = {
        id: Date.now(),
        roomId: currentRoom,
        author: 'システム',
        message: `${currentUser} が切断しました。`,
        timestamp: timeStr,
      };

      if (supabase) {
        await supabase.from('messages').insert([
          { room_id: currentRoom, author: 'システム', message: `${currentUser} が切断しました。`, timestamp: timeStr }
        ]);
      }

      io.to(currentRoom).emit('receive_message', disconnectMsg);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
