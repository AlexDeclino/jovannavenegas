// Wraps the page in a password gate until launch. The page is encrypted
// (PBKDF2 + AES-GCM), so its content can't be read from the file without
// the password. The password itself is never written to the repo.
const ITERATIONS = 250000
const enc = new TextEncoder()
const b64 = (bytes) => Buffer.from(bytes).toString('base64')

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)))
}

export async function encryptPage(html, password) {
  // Salt and IV are derived from the inputs so an unchanged page encrypts to
  // the same bytes and the Action doesn't commit a new file on every run.
  const salt = (await sha256(`jovannavenegas-preview:${password}`)).slice(0, 16)
  const iv = (await sha256(`${password}:${html}`)).slice(0, 12)
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256'}, baseKey, {name: 'AES-GCM', length: 256}, false, ['encrypt'])
  const data = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, enc.encode(html)))
  return gatePage({salt: b64(salt), iv: b64(iv), data: b64(data)})
}

const gatePage = (payload) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Jovanna Venegas</title>
<style>
body{margin:0;background:#fff;font-family:Helvetica,Arial,Verdana,sans-serif;font-size:13.25px;line-height:1.4;text-transform:uppercase;color:#000}
form{box-sizing:border-box;max-width:1440px;margin:0 auto;padding:48px 5vw;display:flex;flex-direction:column;gap:12px;align-items:flex-start}
h1{margin:0;font-size:inherit;font-weight:700}
input,button{font:inherit;text-transform:inherit;color:#000;background:#fff;border:1px solid #000;border-radius:0;padding:6px 8px}
input{width:240px;text-transform:none}
button{cursor:pointer}
p{margin:0;color:#444;min-height:1.4em}
</style>
</head>
<body>
<form id="gate">
<h1>JOVANNA VENEGAS</h1>
<input id="pw" type="password" placeholder="PASSWORD" autocomplete="current-password" autofocus>
<button type="submit">ENTER</button>
<p id="msg"></p>
</form>
<script>
const P = ${JSON.stringify(payload)}
const bytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
async function unlock(pw) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: bytes(P.salt), iterations: ${ITERATIONS}, hash: 'SHA-256'}, base, {name: 'AES-GCM', length: 256}, false, ['decrypt'])
  const html = new TextDecoder().decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(P.iv)}, key, bytes(P.data)))
  try { sessionStorage.setItem('preview-pw', pw) } catch {}
  document.open(); document.write(html); document.close()
}
document.getElementById('gate').addEventListener('submit', (e) => {
  e.preventDefault()
  document.getElementById('msg').textContent = ''
  unlock(document.getElementById('pw').value).catch(() => { document.getElementById('msg').textContent = 'WRONG PASSWORD' })
})
try { const saved = sessionStorage.getItem('preview-pw'); if (saved) unlock(saved).catch(() => sessionStorage.removeItem('preview-pw')) } catch {}
</script>
</body>
</html>
`
