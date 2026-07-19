import http from 'http';

function measure(url: string, token: string) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.get(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          time: performance.now() - start,
          size: data.length
        });
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  const token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjVlODJhZmI0ZWY2OWI3NjM4MzA2OWFjNmI1N2U3ZTY1MjAzYmZlOTYiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiamFnYW5uYXRoIGxhZGFuZSIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NMTEw0ZG15R0xydG00R1dESWYtWkxjTHV2aDI4SV82NmxGelFGSXFCN0QxS1Ffc0E9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vZGFpbHlkaWFyeS1mMmNjNiIsImF1ZCI6ImRhaWx5ZGlhcnktZjJjYzYiLCJhdXRoX3RpbWUiOjE3NzU4MDE5NDgsInVzZXJfaWQiOiJnVXJ0QzFFT2gyU0lGTUVzdDAwOWxmVXQydzkzIiwic3ViIjoiZ1VydEMxRU9oMlNJRk1Fc3QwMDlsZlV0Mnc5MyIsImlhdCI6MTc3NTgwNjIxNSwiZXhwIjoxNzc1ODA5ODE1LCJlbWFpbCI6ImxhZGFuZWphZ2FubmF0aEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjEwOTQ0Nzg5MTAzNDgyMjcyMTYzMSJdLCJlbWFpbCI6WyJsYWRhbmVqYWdhbm5hdGhAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.g7jvcDdTMPu7fPJQR4pJLpJ-YR0r6dsuQp9ig9b-21mugDC5-zKHhG7dfvdxLLnXnj0Gf_6Aj648MvhlLKfAi6sy216XqYt0MfBlmTmcMY66ej4EfVrPKhpB8-ogSY3cDven983znFiNlsH1-fXrRoDYnDkZVKpD_qX7gpdhV9HM93xm7srGDd_PVYBr0zVSN8tCSEmL2gK8ZjSGSm3dQUq3IR402EWjuaZO2Lc-L0SxGXv6n-XZPAXVXbC37Cw_xcK-BqxBDXjZoNCqCc68-lvHO-X20LDUgq0g03mc5I2-VPmEfOl4N3bZvvzVtCDdhq_P8zeaDaOj_WK93ejKfw';
  
  console.log("Measuring /api/users/me");
  console.log(await measure('http://localhost:5000/api/users/me', token));
  
  console.log("Measuring /api/entries?limit=20");
  console.log(await measure('http://localhost:5000/api/entries?limit=20', token));
  
  console.log("Measuring /api/challenges/my");
  console.log(await measure('http://localhost:5000/api/challenges/my', token));
}

main();
