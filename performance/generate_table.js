const fs = require('fs');

const stages = [1, 10, 25, 50, 100, 250];

console.log('| VUs | RPS | Avg (ms) | Med (ms) | P90 (ms) | P95 (ms) | Error % | Total Reqs |');
console.log('|-----|-----|----------|----------|----------|----------|---------|------------|');

for (const v of stages) {
    const file = `results/summary_${v}.json`;
    if (fs.existsSync(file)) {
        try {
            const s = JSON.parse(fs.readFileSync(file, 'utf8'));
            const reqs = s.metrics.http_reqs ? s.metrics.http_reqs.count : 0;
            const rps = s.metrics.http_reqs ? s.metrics.http_reqs.rate.toFixed(2) : '0.00';
            const dur = s.metrics.http_req_duration;
            
            const errRate = s.metrics.http_req_failed ? (s.metrics.http_req_failed.rate * 100).toFixed(2) : '0.00';
            
            if (dur) {
                console.log(`| ${v} | ${rps} | ${dur.avg.toFixed(2)} | ${dur.med.toFixed(2)} | ${dur['p(90)'].toFixed(2)} | ${dur['p(95)'].toFixed(2)} | ${errRate}% | ${reqs} |`);
            } else {
                console.log(`| ${v} | ${rps} | N/A | N/A | N/A | N/A | ${errRate}% | ${reqs} |`);
            }
        } catch (e) {
             console.log(`| ${v} | ERROR PARSING JSON |`);
        }
    } else {
        console.log(`| ${v} | FAILED / NO DATA |`);
    }
}
