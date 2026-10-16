import {apiRoot} from '../../api.js';

export async function publicApi(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(apiRoot + path, {
      credentials: 'omit', signal: controller.signal,
      method: body ? 'POST' : 'GET',
      headers: body ? {'Content-Type': 'application/json'} : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error('API error'), {status: response.status, code: data.error?.code});
    return data;
  } finally { clearTimeout(timeout); }
}

export async function publicList(path) {
  const items = [], seen = new Set();
  let cursor;
  do {
    const data = await publicApi(path + (cursor == null ? '' : `${path.includes('?') ? '&' : '?'}cursor=${cursor}`));
    if (!Array.isArray(data.items) || seen.has(data.next_cursor)) throw Error('Invalid list');
    items.push(...data.items); cursor = data.next_cursor;
    if (cursor != null) seen.add(cursor);
  } while (cursor != null);
  return items;
}

export const shopHref = shop => '/shops/' + encodeURIComponent(shop.slug);
export const venueHref = venue => '/venues/' + encodeURIComponent(venue.slug);
