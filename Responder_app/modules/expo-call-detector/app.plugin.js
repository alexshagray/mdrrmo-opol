const { withAndroidManifest, withPlugins } = require('expo/config-plugins');

const withInCallService = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Add necessary permissions
    const permissions = [
      'android.permission.READ_PHONE_STATE',
      'android.permission.CALL_PHONE',
      'android.permission.MANAGE_OWN_CALLS',
      'android.permission.READ_CONTACTS',
      'android.permission.ANSWER_PHONE_CALLS'
    ];

    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const existingPermissions = manifest['uses-permission'].map((p) => p.$['android:name']);
    
    permissions.forEach((permission) => {
      if (!existingPermissions.includes(permission)) {
        manifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // Add InCallService to application
    const application = manifest.application[0];
    application.service = application.service || [];

    const serviceName = 'expo.modules.calldetector.CustomInCallService';
    const hasService = application.service.some((s) => s.$['android:name'] === serviceName);

    if (!hasService) {
      application.service.push({
        $: {
          'android:name': serviceName,
          'android:permission': 'android.permission.BIND_INCALL_SERVICE',
          'android:exported': 'true',
        },
        'meta-data': [
          {
            $: {
              'android:name': 'android.telecom.IN_CALL_SERVICE_UI',
              'android:value': 'true',
            },
          },
        ],
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.telecom.InCallService' } },
            ],
          },
        ],
      });
    }

    // Add intent filter to the main activity so it can act as the default dialer
    const mainActivity = application.activity.find(
      (a) => a.$['android:name'] === '.MainActivity'
    );
    if (mainActivity) {
      mainActivity['intent-filter'] = mainActivity['intent-filter'] || [];
      const hasDialIntent = mainActivity['intent-filter'].some((f) =>
        f.action?.some((a) => a.$['android:name'] === 'android.intent.action.DIAL')
      );
      if (!hasDialIntent) {
        mainActivity['intent-filter'].push({
          action: [
            { $: { 'android:name': 'android.intent.action.DIAL' } },
          ],
          category: [
            { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          ],
          data: [
            { $: { 'android:scheme': 'tel' } },
          ],
        });
        
        // Android also requires an ACTION_DIAL intent filter without a scheme
        mainActivity['intent-filter'].push({
          action: [
            { $: { 'android:name': 'android.intent.action.DIAL' } },
          ],
          category: [
            { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          ],
        });
      }
    }

    return config;
  });
};

module.exports = function (config) {
  return withPlugins(config, [withInCallService]);
};
