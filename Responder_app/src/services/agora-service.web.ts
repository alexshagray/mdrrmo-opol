export class AgoraManager {
  async initialize(appId: string, eventHandlers: any) {
    console.log('[Web Mock] Agora initialized');
  }
  joinChannel(channelName: string) {
    console.log('[Web Mock] Joined channel:', channelName);
  }
  leaveChannel() {
    console.log('[Web Mock] Left channel');
  }
  release() {
    console.log('[Web Mock] Agora released');
  }
}
