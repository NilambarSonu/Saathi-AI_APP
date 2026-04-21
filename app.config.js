module.exports = ({ config }) => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    config?.ios?.config?.googleMapsApiKey ||
    config?.android?.config?.googleMaps?.apiKey ||
    '';

  return {
    ...config,
    ios: {
      ...(config.ios || {}),
      config: {
        ...((config.ios && config.ios.config) || {}),
        googleMapsApiKey,
      },
    },
    android: {
      ...(config.android || {}),
      intentFilters: [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "saathiai",
              "host": "oauth-callback"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ],
      config: {
        ...((config.android && config.android.config) || {}),
        googleMaps: {
          ...((config.android && config.android.config && config.android.config.googleMaps) || {}),
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
