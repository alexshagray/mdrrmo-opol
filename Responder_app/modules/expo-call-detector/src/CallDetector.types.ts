export type CallDetectorModuleEvents = {
  onCallAdded: (params: { phoneNumber: string }) => void;
  onCallRemoved: () => void;
  onCallStateChanged: (params: { state: number; phoneNumber: string }) => void;
};
