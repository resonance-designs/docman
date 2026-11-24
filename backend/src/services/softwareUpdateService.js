import http from 'node:http';

// Fixed local endpoint; the web application receives no sudo or arbitrary command access.
export function updaterRequest(payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const request = http.request({ socketPath: '/run/docman-web-updater/control.sock', path: '/control', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 60000 }, response => {
            let data = '';
            response.setEncoding('utf8');
            response.on('aborted', () => reject(new Error('Updater response aborted')));
            response.on('error', reject);
            response.on('data', chunk => {
                data += chunk;
                if (data.length > 2_000_000) request.destroy(new Error('Updater response too large'));
            });
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (response.statusCode >= 400) return reject(Object.assign(new Error(parsed.message || 'Updater request failed'), { status: response.statusCode }));
                    resolve(parsed);
                } catch { reject(new Error('Invalid updater response')); }
            });
        });
        request.on('timeout', () => request.destroy(new Error('Updater request timed out')));
        request.on('error', reject);
        request.end(body);
    });
}
