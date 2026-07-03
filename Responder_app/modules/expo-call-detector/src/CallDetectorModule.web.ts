import { registerWebModule, NativeModule } from 'expo';

import { CallDetectorModuleEvents } from './CallDetector.types';

// CallDetectorModule is not available on the web platform.
class CallDetectorModule extends NativeModule<CallDetectorModuleEvents> {}

export default registerWebModule(CallDetectorModule, 'CallDetectorModule');
