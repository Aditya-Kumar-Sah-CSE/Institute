const fetchPromises: Record<string, Promise<any> | undefined> = {};
const cache: Record<string, { data: any, timestamp: number }> = {};

export const fetchDeduplicated = async (url: string, maxAgeMs = 5000) => {
  if (cache[url] && Date.now() - cache[url].timestamp < maxAgeMs) {
    return cache[url].data;
  }
  if (fetchPromises[url]) {
    return fetchPromises[url];
  }
  
  const p = fetch(url).then(r => r.json()).then(data => {
    cache[url] = { data, timestamp: Date.now() };
    delete fetchPromises[url];
    return data;
  }).catch(e => {
    delete fetchPromises[url];
    throw e;
  });
  
  fetchPromises[url] = p;
  return p;
};
