export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const start = performance.now();
  try {
    const response = await fetch(url, options);
    console.log(`[API FETCH] ${options.method || 'GET'} ${endpoint} | Status: ${response.status} | Time: ${(performance.now() - start).toFixed(2)}ms`);
    return response;
  } catch (error) {
    console.log(`[API FETCH] ${options.method || 'GET'} ${endpoint} | FAILED | Time: ${(performance.now() - start).toFixed(2)}ms`);
    throw error;
  }
};
