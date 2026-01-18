// api.js
import axios from 'axios';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// persistent localStorage prefix
const LS_PREFIX = 'api-cache:';

const BASE_URLS = import.meta.env.MODE === 'development'
  ? ['http://localhost:8000']
  : [
      'https://campusfix-v8.onrender.com',              // 🔥 Primary (priority)
      'https://campusfix-backend-s2ow.onrender.com'     // Fallback
    ];

let currentBaseIndex = 0;

const api = axios.create({
  baseURL: BASE_URLS[currentBaseIndex],
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Helper: compute a stable full URL key for caches
 */
function getFullUrl(config) {
  const url = config.url || '';
  // If config.url is absolute, return it directly
  if (/^https?:\/\//i.test(url)) return url;

  const base = (config.baseURL || api.defaults.baseURL || '') || '';
  // avoid duplicate slashes
  if (base.endsWith('/') && url && url.startsWith('/')) {
    return base.slice(0, -1) + url;
  }
  if (!base.endsWith('/') && url && !url.startsWith('/')) {
    return base + '/' + url;
  }
  return base + (url || '');
}

/**
 * Create a very small thumbnail from a dataURL (base64 image).
 * Returns a dataURL (jpeg) or null on failure.
 *
 * Note: This runs in the browser using canvas and is asynchronous.
 */
function createThumbnailFromDataUrl(dataUrl, maxWidth = 90, quality = 0.35) {
  return new Promise((resolve) => {
    try {
      // browser-only check
      if (typeof document === 'undefined') {
        return resolve(null);
      }

      const img = new Image();
      img.onload = function () {
        try {
          const scale = Math.min(1, maxWidth / img.width);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');

          // draw and export as jpeg low quality
          ctx.drawImage(img, 0, 0, w, h);
          const thumb = canvas.toDataURL('image/jpeg', quality);

          // quick size check: if thumb is larger than ~50KB reject to avoid large LS items
          const approxKb = Math.ceil((thumb.length - 'data:image/jpeg;base64,'.length) * 3 / 4 / 1024);
          if (approxKb > 60) {
            return resolve(null);
          }
          return resolve(thumb);
        } catch (err) {
          console.warn('⚠️ Thumbnail creation error', err);
          return resolve(null);
        }
      };
      img.onerror = function () {
        return resolve(null);
      };

      // If the dataUrl lacks a mime, this still works for most dataurls
      img.src = dataUrl;
      // In case image was cached and loaded instantly
      if (img.complete && img.naturalWidth) {
        img.onload();
      }
    } catch (err) {
      console.warn('⚠️ createThumbnailFromDataUrl failed', err);
      return resolve(null);
    }
  });
}

/**
 * Make a "lite" copy of an issue item suitable for localStorage.
 * Keeps key small fields, sets image_data to null, optionally includes `thumb` if created.
 */
function makeLiteIssue(issue, thumb) {
  return {
    id: issue.id,
    title: issue.title,
    status: issue.status,
    category: issue.category,
    sub_location: issue.sub_location,
    specific_location: issue.specific_location,
    priority: issue.priority,
    created_at: issue.created_at,
    owner_id: issue.owner_id,
    owner_name: issue.owner_name || (issue.owner ? issue.owner.full_name : undefined),
    rating: issue.rating ?? null,
    review: issue.review ?? null,
    // keep image_data null to avoid large payloads
    image_data: null,
    // tiny preview if available
    thumb: thumb || null
  };
}

/**
 * REQUEST INTERCEPTOR
 * - attaches token
 * - serves in-memory cache immediately
 * - if memory miss: serve localStorage cached data instantly AND kick background refresh
 * - background refresh sets header 'X-Background-Refresh' so the interceptor won't short-circuit it
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Only apply caching for GET requests
    if ((config.method || '').toLowerCase() === 'get') {
      const fullUrl = getFullUrl(config);
      const cached = cache.get(fullUrl);

      // 1) If memory cache is fresh -> return it synchronously (no network)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION && !config.headers['X-Background-Refresh']) {
        console.log('✅ Using in-memory cached data for:', fullUrl);
        config.adapter = () => Promise.resolve({
          data: cached.data,
          status: 200,
          statusText: 'OK (Cached)',
          headers: {},
          config
        });
        return config;
      }

      // 2) If memory miss, check localStorage and return it instantly (also trigger background refresh)
      if (!config.headers['X-Background-Refresh']) {
        try {
          const lsRaw = localStorage.getItem(LS_PREFIX + fullUrl);
          if (lsRaw) {
            const lsData = JSON.parse(lsRaw);
            console.log('🕓 Using localStorage cached data for:', fullUrl);

            // Serve LS data immediately (lite for /issues, full for others)
            config.adapter = () => Promise.resolve({
              data: lsData,
              status: 200,
              statusText: 'OK (LocalStorage)',
              headers: {},
              config
            });

            // Kick off a background refresh (so fresh data is fetched and caches updated)
            const refreshConfig = {
              ...config,
              headers: {
                ...(config.headers || {}),
                'X-Background-Refresh': '1'
              },
              // ensure we don't reuse the adapter we just set
              adapter: undefined
            };

            // Use a microtask so axios finishes returning the cached response first
            setTimeout(() => {
              api.request(refreshConfig).catch((err) => {
                // background refresh errors are non-fatal; just log
                console.warn('⚠️ Background refresh failed for', fullUrl, err && err.message ? err.message : err);
              });
            }, 0);

            return config;
          }
        } catch (err) {
          // ignore localStorage read errors (private mode, quota, etc.), but log
          console.warn('⚠️ localStorage read failed for', fullUrl, err);
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * RESPONSE INTERCEPTOR
 * - stores successful GET responses in memory cache and localStorage (lite for /issues)
 * - handles failover between backends on network errors / timeouts
 * - retries on timeout once with longer timeout
 * - handles 401
 */
api.interceptors.response.use(
  (response) => {
    try {
      if (response.config && (response.config.method || '').toLowerCase() === 'get' && response.status === 200) {
        const fullUrl = getFullUrl(response.config);

        // memory cache -> keep full response in memory (fast while tab open)
        cache.set(fullUrl, {
          data: response.data,
          timestamp: Date.now()
        });

        // persistent cache -> for most endpoints we store the full response,
        // but for /issues we store a lightweight stripped version to avoid quota issues.
        (async () => {
          try {
            if (fullUrl.includes('/issues')) {
              // if it's an array of issues, build lite array
              const arr = Array.isArray(response.data) ? response.data : (response.data?.issues || []);
              // attempt to create a single thumbnail per issue (async, cheap)
              const litePromises = arr.map(async (issue) => {
                // do not block: if image_data is large, try to create a tiny thumb
                let thumb = null;
                try {
                  if (issue && issue.image_data && typeof issue.image_data === 'string') {
                    thumb = await createThumbnailFromDataUrl(issue.image_data);
                  }
                } catch (err) {
                  // ignore thumb errors
                  thumb = null;
                }
                return makeLiteIssue(issue || {}, thumb);
              });

              const liteArr = await Promise.all(litePromises);

              try {
                localStorage.setItem(LS_PREFIX + fullUrl, JSON.stringify(liteArr));
              } catch (err) {
                // ignore quota/write errors
                console.warn('⚠️ localStorage write failed for (lite issues)', fullUrl, err);
              }
            } else {
              // store full response data for small endpoints (stats, user, etc.)
              try {
                localStorage.setItem(LS_PREFIX + fullUrl, JSON.stringify(response.data));
              } catch (err) {
                // ignore quota/write errors
                console.warn('⚠️ localStorage write failed for', fullUrl, err);
              }
            }
          } catch (err) {
            console.warn('⚠️ Persistent cache async error for', fullUrl, err);
          }
        })();
      }
    } catch (err) {
      // swallow any caching-related errors so normal flow isn't broken
      console.warn('⚠️ Cache store error', err);
    }
    return response;
  },
  async (error) => {
    const config = error.config || {};

    // Determine network/timeout conditions
    const isNetworkOrTimeout = !error.response || error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('network error'));

    // 1) Failover between base URLs (only do once per request)
    if (!config._failoverTried && isNetworkOrTimeout && BASE_URLS.length > 1) {
      config._failoverTried = true;

      // switch to next backend
      currentBaseIndex = (currentBaseIndex + 1) % BASE_URLS.length;
      const newBase = BASE_URLS[currentBaseIndex];

      console.warn('🔁 Switching backend to:', newBase);
      api.defaults.baseURL = newBase;
      config.baseURL = newBase;
      config.timeout = 60000;

      // retry the original request against the new backend
      return api.request(config);
    }

    // 2) Timeout retry for Render cold starts (keep original behavior)
    if (error.code === 'ECONNABORTED' && !config._retry) {
      config._retry = true;
      config.timeout = 60000;
      console.warn('⏱️ Request timeout, retrying with 60s timeout...');
      return api.request(config);
    }

    // 3) Handle 401 errors
    if (error.response?.status === 401) {
      const isLoginPage = window.location.pathname === '/';

      if (!isLoginPage) {
        console.warn('🔐 Authentication failed, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
