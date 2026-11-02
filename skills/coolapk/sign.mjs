import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const bcrypt = require('./vendor/bcryptjs/index.js');

export const C = JSON.parse(fs.readFileSync(new URL('./consts.json', import.meta.url),'utf8'));
const authBlob = Buffer.from(C.authBlob,'base64');
export const APP_CODE = 2609291;
const ALPHA = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const md5 = s => crypto.createHash('md5').update(s,'utf8').digest('hex');
const b64 = b => Buffer.from(b).toString('base64');            // 带 padding
const b64np = b => b64(b).replace(/=+$/,'');                    // 去 padding

export function genToken(device = C.device, ts0 = Math.floor(Date.now()/1000)){
  const md5d = md5(device);
  let lastErr='';
  for(let off=0; off<60; off++){
    const ts = ts0 + off;
    const start = ((ts + APP_CODE) % 100) * 4 + 128;
    const segB64 = authBlob.slice(start, start+128).toString('latin1');
    const segment = Buffer.from(segB64,'base64').toString('utf8');
    const plain = `com.coolapk.market&${segment}&${md5d}&${ts}&${APP_CODE}`;
    const password = md5(b64(plain));   // 注意: base64.b64encode 保留 padding
    let salt = Buffer.from(`${ts.toString(16)}/${md5(plain)}`,'utf8').toString('base64').slice(0,22);
    if(salt.length !== 22){ lastErr='salt len'; continue; }
    if(![...salt].every(c => ALPHA.includes(c))){ lastErr='salt charset'; continue; }
    salt = salt.slice(0,21) + ALPHA[ALPHA.indexOf(salt[21]) & 0x30];
    const digest = bcrypt.hashSync(password, `$2y$04$${salt}`);
    return { token: 'v3' + b64np(digest), ts };
  }
  throw new Error('sign failed: '+lastErr);
}

export function headers(token){
  return {
    'User-Agent': C.ua,
    'X-Requested-With': 'XMLHttpRequest',
    'X-Sdk-Int': '36',
    'X-Sdk-Locale': 'zh-CN',
    'X-App-Id': 'com.coolapk.market',
    'X-App-Token': token,
    'X-App-Version': '16.6.4',
    'X-App-Code': String(APP_CODE),
    'X-Api-Version': '16',
    'X-App-Device': C.device,
    'X-Dark-Mode': '0',
    'X-App-Channel': 'coolapk',
    'X-App-Mode': 'universal',
    'X-App-Supported': String(APP_CODE),
  };
}
