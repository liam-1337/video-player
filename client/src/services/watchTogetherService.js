let socket = null;
let onMessageHandler = null;
let onOpenHandler = null;
let onCloseHandler = null;
let onErrorHandler = null;

const connect = (mediaId, token) => {
  const encodedMediaId = encodeURIComponent(mediaId);
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}?mediaId=${encodedMediaId}&token=${token || ''}`; // Ensure token is not 'undefined'

  if (socket && socket.readyState !== WebSocket.CLOSED && socket.url === wsUrl) {
    console.log('WatchTogetherService: Already connected to the same room.');
    if (onOpenHandler) onOpenHandler(); // Re-trigger open handler if needed for UI state
    return;
  }
  if (socket && socket.readyState !== WebSocket.CLOSED) {
    console.log('WatchTogetherService: Different room or state, closing old socket.');
    socket.close();
  }

  console.log(`WatchTogetherService: Connecting to ${wsUrl}`);
  socket = new WebSocket(wsUrl);
  socket.onopen = (event) => { if (onOpenHandler) onOpenHandler(event); };
  socket.onmessage = (event) => {
    try { const data = JSON.parse(event.data); if (onMessageHandler) onMessageHandler(data); }
    catch (e) { console.error('WS parse error', e); }
  };
  socket.onclose = (event) => { if (onCloseHandler) onCloseHandler(event); socket = null; };
  socket.onerror = (error) => { if (onErrorHandler) onErrorHandler(error); };
};

const sendMessage = (message) => {
  if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  else console.error('WS not connected. Cannot send.');
};

const closeConnection = () => { if (socket) { socket.close(); socket = null; }};

const watchTogetherService = {
  connect, sendMessage, closeConnection,
  setOnMessageHandler: (h) => { onMessageHandler = h; },
  setOnOpenHandler: (h) => { onOpenHandler = h; },
  setOnCloseHandler: (h) => { onCloseHandler = h; },
  setOnErrorHandler: (h) => { onErrorHandler = h; },
  getSocketState: () => socket?.readyState // Expose socket state
};
export default watchTogetherService;
