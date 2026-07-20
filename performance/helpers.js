import { check, sleep } from 'k6';
import { config } from './config.js';

export function getRandomToken() {
  const tokens = config.testTokens;
  return tokens[Math.floor(Math.random() * tokens.length)];
}

export function authHeaders() {
  return {
    headers: {
      'Authorization': `Bearer ${getRandomToken()}`,
      'Content-Type': 'application/json',
    },
  };
}

export function simulateThinkTime(min = 1, max = 3) {
  sleep(Math.random() * (max - min) + min);
}

export function validateResponse(response, name) {
  const success = check(response, {
    [`${name} status is 200 or 201`]: (r) => r.status === 200 || r.status === 201,
  });
  if (!success) {
    console.error(`Failed ${name}: Status ${response.status} - ${response.body}`);
  }
  return success;
}
