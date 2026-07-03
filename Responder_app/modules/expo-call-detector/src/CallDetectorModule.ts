import { NativeModule, requireNativeModule } from 'expo';

import { CallDetectorModuleEvents } from './CallDetector.types';

declare class CallDetectorModule extends NativeModule<CallDetectorModuleEvents> {
  answerCall(): void;
  rejectCall(): void;
  disconnectCall(): void;
  getCurrentCallPhoneNumber(): string | null;
  isDefaultDialer(): boolean;
  requestDefaultDialer(): Promise<boolean>;
}

let callDetectorModule: any = null;
try {
  callDetectorModule = requireNativeModule<CallDetectorModule>('CallDetector');
} catch (e) {
  callDetectorModule = {
    addListener: () => ({ remove: () => {} }),
    answerCall: () => {},
    rejectCall: () => {},
    disconnectCall: () => {},
    getCurrentCallPhoneNumber: () => null,
    isDefaultDialer: () => false,
    requestDefaultDialer: () => Promise.resolve(false),
  };
}

export default callDetectorModule;
