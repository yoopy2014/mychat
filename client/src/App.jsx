import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const SOCKET_URL = 'https://chat-server-6t4i.onrender.com';

const socket = io(SOCKET_URL, {
  autoConnect: false,
});

const STAMPS = ['😊', '👍', '❤️', '🎉', '🔥', '😭', '😎', '🙏'];
const DEFAULT_ROOMS = ['雑談', 'ゲーム', 'プログラミング'];

export default function App() {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('雑談');
  const [customRoom, setCustomRoom] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [message, setMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showStamps, setShowStamps] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.connect();

    socket.on('receive_message', (data) => {
      setMessageList((prev) => [...prev, data]);
    });

    socket.on('user_typing', (data) => {
      setIsTyping(data.isTyping);
    });

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageList]);

  const handleJoinRoom = (targetRoom) => {
    const roomToJoin = targetRoom || roomId;
    if (!username.trim() || !roomToJoin.trim()) return;

    setMessageList([]); // ルーム切替時にメッセージ履歴をクリア
    socket.emit('join_room', { roomId: roomToJoin, username });
    setRoomId(roomToJoin);
    setIsJoined(true);
  };

  const sendMessage = (textToSend) => {
    const text = textToSend || message;
    if (text.trim()) {
      const messageData = {
        roomId,
        author: username,
        message: text,
      };
      socket.emit('send_message', messageData);
      setMessage('');
      setShowStamps(false);
      socket.emit('typing', { roomId, isTyping: false });
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', { roomId, isTyping: e.target.value.length > 0 });
  };

  if (!isJoined) {
    return (
      <div className="login-screen">
        <h2>LINE チャット</h2>
        <input
          type="text"
          placeholder="表示名を入力"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <div className="room-selection-area">
          <p>トークルームを選択</p>
          <div className="preset-rooms">
            {DEFAULT_ROOMS.map((room) => (
              <button
                key={room}
                className={`room-chip ${roomId === room && !customRoom ? 'selected' : ''}`}
                onClick={() => {
                  setRoomId(room);
                  setCustomRoom('');
                }}
              >
                #{room}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="または好きなルーム名を入力"
            value={customRoom}
            onChange={(e) => {
              setCustomRoom(e.target.value);
              setRoomId(e.target.value);
            }}
          />
        </div>

        <button className="join-btn" onClick={() => handleJoinRoom()}>
          入室する
        </button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-info">
          <h3>#{roomId}</h3>
          <span className="user-info">ユーザー: {username}</span>
        </div>
        <div className="room-switcher">
          <select
            value={roomId}
            onChange={(e) => handleJoinRoom(e.target.value)}
          >
            {DEFAULT_ROOMS.map((room) => (
              <option key={room} value={room}>
                #{room}
              </option>
            ))}
            {!DEFAULT_ROOMS.includes(roomId) && (
              <option value={roomId}>#{roomId}</option>
            )}
          </select>
        </div>
      </div>

      <div className="chat-messages">
        {messageList.map((msg) => {
          const isMe = msg.author === username;
          const isSystem = msg.author === 'システム';

          if (isSystem) {
            return (
              <div key={msg.id} className="system-message">
                <span>{msg.message}</span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`message-row ${isMe ? 'me' : 'other'}`}>
              {!isMe && <div className="author">{msg.author}</div>}
              <div className="bubble-wrapper">
                <div className="bubble">{msg.message}</div>
                <span className="timestamp">{msg.timestamp}</span>
              </div>
            </div>
          );
        })}
        {isTyping && <div className="typing-status">相手が入力中...</div>}
        <div ref={messagesEndRef} />
      </div>

      {showStamps && (
        <div className="stamp-picker">
          {STAMPS.map((stamp, idx) => (
            <button key={idx} className="stamp-btn" onClick={() => sendMessage(stamp)}>
              {stamp}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-area">
        <button className="toggle-stamp-btn" onClick={() => setShowStamps(!showStamps)}>
          😊
        </button>
        <input
          type="text"
          value={message}
          placeholder="メッセージを入力"
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button className="send-btn" onClick={() => sendMessage()}>
          送信
        </button>
      </div>
    </div>
  );
}
