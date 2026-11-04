// Static assets don't answer HTTP Range requests, and iOS Safari won't play a <video> without them.
// This Worker only runs for /assets/video/* (see run_worker_first in wrangler.toml); everything else
// is served straight from assets. ponytail: buffers the whole file (hero videos are ~4 MB).

/** Parse a single "bytes=a-b" range against a file size. Returns [start, end] inclusive, or null if unsatisfiable. */
export function byteRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!m || (m[1] === '' && m[2] === '')) return undefined; // not a range we handle: send the whole file
  let start, end;
  if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; } // suffix: last N bytes
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  return start < size && start <= end ? [start, end] : null;
}

export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    if (res.status !== 200) return res;
    const headers = new Headers(res.headers);
    headers.set('Accept-Ranges', 'bytes');
    const range = request.headers.get('Range');
    if (!range) return new Response(res.body, { status: 200, headers });
    const buf = await res.arrayBuffer();
    const r = byteRange(range, buf.byteLength);
    if (r === undefined) return new Response(buf, { status: 200, headers });
    if (r === null) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${buf.byteLength}` } });
    const [start, end] = r;
    headers.set('Content-Range', `bytes ${start}-${end}/${buf.byteLength}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(buf.slice(start, end + 1), { status: 206, headers });
  },
};
