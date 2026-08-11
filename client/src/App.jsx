import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3001', {
  autoConnect: false,
});

const STAMPS = ['😊', '👍', '❤️', '🎉', '🔥', '😭', '😎', '🙏'];

export default function App() {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('トークルーム');
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

  const joinRoom = () => {
    if (username.trim()) {
      socket.emit('join_room', { roomId, username });
      setIsJoined(true);
    }
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
          onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
        />
        <button onClick={joinRoom}>入室する</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>{roomId}</h3>
        <span className="user-info">ログイン中: {username}</span>
      </div>

      <div className="chat-messages">
        {messageList.map((msg) => {
          const isMe = msg.author === username;
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
        <button className="send-btn" onClick={() => sendMessage()}>送信</button>
      </div>
    </div>
  );
}