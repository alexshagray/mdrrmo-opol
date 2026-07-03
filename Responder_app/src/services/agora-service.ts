let AgoraEngine: any = null;
let ChannelProfile: any = {};
let ClientRole: any = {};
let isAgoraAvailable = false;

try {
  // Dynamic load react-native-agora to prevent crashes on Expo Go/simulators
  const Agora = require('react-native-agora');
  if (Agora) {
    AgoraEngine = Agora.createAgoraRtcEngine;
    ChannelProfile = Agora.ChannelProfileType;
    ClientRole = Agora.ClientRoleType;
    isAgoraAvailable = !!AgoraEngine;
  }
} catch (e) {
  console.warn(
    '[AgoraManager] react-native-agora native module is not available (running in Expo Go or unlinked). Falling back to mock service.'
  );
}

export class AgoraManager {
  private engine: any = null;

  async initialize(appId: string, eventHandlers: {
    onJoinChannelSuccess?: () => void;
    onUserJoined?: (uid: number) => void;
    onUserOffline?: (uid: number) => void;
  }) {
    if (!isAgoraAvailable) {
      console.log('[Agora Mock] Initializing Agora with App ID:', appId);
      setTimeout(() => {
        eventHandlers.onJoinChannelSuccess?.();
      }, 500);
      return;
    }

    try {
      this.engine = AgoraEngine();
      this.engine.initialize({ appId });
      this.engine.registerEventHandler({
        onJoinChannelSuccess: (_connection: any, elapsed: number) => {
          eventHandlers.onJoinChannelSuccess?.();
        },
        onUserJoined: (_connection: any, uid: number, elapsed: number) => {
          eventHandlers.onUserJoined?.(uid);
        },
        onUserOffline: (_connection: any, uid: number, reason: number) => {
          eventHandlers.onUserOffline?.(uid);
        }
      });
      this.engine.enableAudio();
    } catch (err) {
      console.warn('[AgoraManager] Initialization failed, using mockup fallback:', err);
      isAgoraAvailable = false;
      setTimeout(() => {
        eventHandlers.onJoinChannelSuccess?.();
      }, 500);
    }
  }

  joinChannel(channelName: string) {
    if (!isAgoraAvailable) {
      console.log('[Agora Mock] Joined channel:', channelName);
      return;
    }

    try {
      if (this.engine) {
        this.engine.joinChannel('', channelName, 0, {
          channelProfile: ChannelProfile.ChannelProfileCommunication ?? 0,
          clientRoleType: ClientRole.ClientRoleBroadcaster ?? 1,
          publishMicrophoneTrack: true,
          autoSubscribeAudio: true,
        });
        this.engine.setEnableSpeakerphone(true);
      }
    } catch (err) {
      console.warn('[AgoraManager] joinChannel error:', err);
    }
  }

  leaveChannel() {
    if (!isAgoraAvailable) {
      console.log('[Agora Mock] Left channel');
      return;
    }

    try {
      if (this.engine) {
        this.engine.leaveChannel();
      }
    } catch (err) {
      console.warn('[AgoraManager] leaveChannel error:', err);
    }
  }

  release() {
    if (!isAgoraAvailable) {
      console.log('[Agora Mock] Released');
      return;
    }

    try {
      if (this.engine) {
        this.engine.release();
        this.engine = null;
      }
    } catch (err) {
      console.warn('[AgoraManager] release error:', err);
    }
  }
}

