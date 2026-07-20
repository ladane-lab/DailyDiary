import http from 'k6/http';
import { config } from './config.js';
import { simulateThinkTime, validateResponse, getRandomToken } from './helpers.js';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const token = getRandomToken();
  const headers = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // Sync User
  const syncPayload = JSON.stringify({
    email: `${token}@dailydiary.in`,
    name: `Test User ${token}`,
  });
  let res = http.post(`${config.backendBaseUrl}/api/users/sync`, syncPayload, headers);
  validateResponse(res, 'Sync User');
  simulateThinkTime(1, 2);
  
  // Dashboard
  res = http.get(`${config.backendBaseUrl}/api/dashboard/init`, headers);
  validateResponse(res, 'Dashboard Init');
  simulateThinkTime(1, 2);

  // Timeline
  res = http.get(`${config.backendBaseUrl}/api/entries`, headers);
  validateResponse(res, 'Timeline Fetch');
  simulateThinkTime(1, 2);
  
  // Public Feed
  res = http.get(`${config.backendBaseUrl}/api/entries/public`, headers);
  validateResponse(res, 'Public Feed');
  simulateThinkTime(1, 2);

  // Create Journal
  const payload = JSON.stringify({
    templateId: "personal",
    body: "Smoke test entry",
    isPublic: true,
    responses: [],
    images: [],
    theme: "marble"
  });
  res = http.post(`${config.backendBaseUrl}/api/entries`, payload, headers);
  validateResponse(res, 'Create Entry');
  
  let entryId = null;
  if (res.status === 201) {
    entryId = res.json().id;
  }
  simulateThinkTime(1, 2);

  // Edit Journal
  if (entryId) {
    const editPayload = JSON.stringify({
      body: "Smoke test entry updated",
      isPublic: true,
    });
    res = http.patch(`${config.backendBaseUrl}/api/entries/${entryId}`, editPayload, headers);
    validateResponse(res, 'Edit Entry');
    simulateThinkTime(1, 2);
    
    // Delete Journal
    res = http.del(`${config.backendBaseUrl}/api/entries/${entryId}`, null, headers);
    validateResponse(res, 'Delete Entry');
  }
}
