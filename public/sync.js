let clockOffset = 0;
async function syncClock() {
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch('/api/time');
      const data = await res.json();
      const t1 = Date.now();
      samples.push({ offset: data.t - (t0 + (t1 - t0) / 2), rtt: t1 - t0 });
    } catch (e) {}
  }
  if (samples.length > 0) {
    samples.sort((a, b) => a.rtt - b.rtt);
    clockOffset = samples[0].offset;
  }
}
const getServerNow = () => Date.now() + clockOffset;

function connectSSE(role, onUpdate) {
  const es = new EventSource('/events?role=' + role);
  es.onmessage = (e) => onUpdate(JSON.parse(e.data));
  es.onerror = () => {
    es.close();
    setInterval(async () => {
      try {
        const res = await fetch('/api/state');
        onUpdate(await res.json());
      } catch (e) {}
    }, 4000);
  };
}

function formatTime(ms) {
  if (ms < 0) ms = 0;
  const s = Math.ceil(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
