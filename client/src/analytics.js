import posthog from 'posthog-js';

export const initAnalytics = () => {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: 'https://us.i.posthog.com',
      loaded: (posthog) => {
        if (import.meta.env.DEV) posthog.debug();
      },
    });
  }
};

export const trackEvent = (event, properties = {}) => {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.capture(event, properties);
  }
};

export const identifyUser = (id, properties = {}) => {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.identify(id, properties);
  }
};

export const resetAnalytics = () => {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    posthog.reset();
  }
};
