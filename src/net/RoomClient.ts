import type { ClientMessage, PlayerInfo, PlayerResult, ServerMessage } from './protocol';

export interface RoomClientCallbacks {
  onRoomCreated?: (roomCode: string) => void;
  onRoomJoined?: (roomCode: string, playerId: string, color: string) => void;
  onPlayerList?: (players: PlayerInfo[]) => void;
  onSongSelected?: (chartId: string) => void;
  onGameStarting?: (chartId: string, startAnchorServerTime: number) => void;
  onPlayerUpdate?: (playerId: string, score: number, combo: number) => void;
  onGameFinished?: (results: PlayerResult[]) => void;
  onRoomClosed?: (reason: string) => void;
  onError?: (message: string) => void;
  onDisconnected?: () => void;
}

const PING_SAMPLE_COUNT = 6;
const PING_INTERVAL_MS = 400;

/**
 * 서버와의 WebSocket 연결 + 클록 동기화를 담당한다. React state와는 분리되어 있으며
 * 콜백을 통해서만 UI에 결과를 알린다.
 *
 * serverTimeOffset은 "내 로컬 시계 + offset ≈ 서버 시계"가 되도록 핑퐁으로 추정한 값이다.
 * 모든 기기가 이 offset을 이용해 songTime = (now() - startAnchorServerTime) / 1000 을
 * 계산하면, 서로 다른 기기에서도 같은 순간에 같은 신호를 보게 된다.
 */
export class RoomClient {
  private socket: WebSocket | null = null;
  private pingSamples: number[] = [];
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private callbacks: RoomClientCallbacks;

  serverTimeOffset = 0;

  constructor(callbacks: RoomClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /** 다른 화면으로 전환될 때 해당 화면이 관심 있는 콜백만 덧씌운다 (기존 콜백은 유지). */
  setCallbacks(partial: RoomClientCallbacks) {
    this.callbacks = { ...this.callbacks, ...partial };
  }

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.addEventListener('open', () => {
        this.startClockSync();
        resolve();
      });
      socket.addEventListener('error', () => reject(new Error('서버에 연결할 수 없어요.')));
      socket.addEventListener('close', () => {
        this.stopClockSync();
        this.callbacks.onDisconnected?.();
      });
      socket.addEventListener('message', (event: MessageEvent) => {
        this.handleMessage(String(event.data));
      });
    });
  }

  disconnect() {
    this.stopClockSync();
    this.socket?.close();
    this.socket = null;
  }

  createRoom() {
    this.send({ type: 'create_room' });
  }

  joinRoom(roomCode: string, name: string) {
    this.send({ type: 'join_room', roomCode, name });
  }

  selectSong(chartId: string) {
    this.send({ type: 'select_song', chartId });
  }

  startGame(startAnchorServerTime: number) {
    this.send({ type: 'start_game', startAnchorServerTime });
  }

  reportUpdate(score: number, combo: number) {
    this.send({ type: 'player_update', score, combo });
  }

  reportFinished(score: number, maxCombo: number) {
    this.send({ type: 'player_finished', score, maxCombo });
  }

  leaveRoom() {
    this.send({ type: 'leave_room' });
  }

  /** 내 로컬 시계를 서버 시계로 환산한 현재 시각(ms 추정치) */
  now(): number {
    return Date.now() + this.serverTimeOffset;
  }

  private send(message: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private startClockSync() {
    this.pingSamples = [];
    const tick = () => this.send({ type: 'ping', t0: Date.now() });
    tick();
    this.pingTimer = setInterval(tick, PING_INTERVAL_MS);
  }

  private stopClockSync() {
    if (this.pingTimer !== null) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private handleMessage(raw: string) {
    let message: ServerMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    switch (message.type) {
      case 'room_created':
        this.callbacks.onRoomCreated?.(message.roomCode);
        break;
      case 'room_joined':
        this.callbacks.onRoomJoined?.(message.roomCode, message.playerId, message.color);
        break;
      case 'player_list':
        this.callbacks.onPlayerList?.(message.players);
        break;
      case 'pong':
        this.recordPong(message.t0, message.serverTime);
        break;
      case 'song_selected':
        this.callbacks.onSongSelected?.(message.chartId);
        break;
      case 'game_starting':
        this.callbacks.onGameStarting?.(message.chartId, message.startAnchorServerTime);
        break;
      case 'player_update':
        this.callbacks.onPlayerUpdate?.(message.playerId, message.score, message.combo);
        break;
      case 'game_finished':
        this.callbacks.onGameFinished?.(message.results);
        break;
      case 'room_closed':
        this.callbacks.onRoomClosed?.(message.reason);
        break;
      case 'error':
        this.callbacks.onError?.(message.message);
        break;
    }
  }

  private recordPong(t0: number, serverTime: number) {
    const t1 = Date.now();
    const rtt = t1 - t0;
    const offset = serverTime + rtt / 2 - t1;

    this.pingSamples.push(offset);
    if (this.pingSamples.length > PING_SAMPLE_COUNT) this.pingSamples.shift();

    const sorted = [...this.pingSamples].sort((a, b) => a - b);
    this.serverTimeOffset = sorted[Math.floor(sorted.length / 2)];
  }
}
