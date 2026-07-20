import http from 'k6/http';
import { config } from './config.js';
import { simulateThinkTime, validateResponse, getRandomToken } from './helpers.js';

export const options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 1,
  duration: __ENV.DURATION || '30s',
};

export default function () {
  const token = getRandomToken();
  const headers = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const syncPayload = JSON.stringify({
    email: `${token}@dailydiary.in`,
    name: `Test User ${token}`,
  });
  let resSync = http.post(`${config.backendBaseUrl}/api/users/sync`, syncPayload, headers);
  validateResponse(resSync, 'Sync User Load');
  simulateThinkTime(1, 2);

  const resDashboard = http.get(`${config.backendBaseUrl}/api/dashboard/init`, headers);
  validateResponse(resDashboard, 'Dashboard Load');
  simulateThinkTime(1, 3);
  
  const resTimeline = http.get(`${config.backendBaseUrl}/api/entries`, headers);
  validateResponse(resTimeline, 'Timeline Load');
  simulateThinkTime(1, 5);

  const resPublic = http.get(`${config.backendBaseUrl}/api/entries/public`, headers);
  validateResponse(resPublic, 'Public Feed Load');
  simulateThinkTime(1, 3);
}
