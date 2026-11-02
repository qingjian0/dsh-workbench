#!/usr/bin/env node
// 酷安客户端：离线签发 X-App-Token v3，纯 HTTP 访问，无需装 App / 无需登录
import { genToken, headers } from './sign.mjs';

const API  = 'https://api.coolapk.com';
const API2 = 'https://api2.coolapk.com';

let TOKEN = genToken().token, TOKEN_TS = Date.now();
function fresh(){ // 实测 token 有效期约 24h，提前换
  if (Date.now() - TOKEN_TS > 3_600_000) { TOKEN = genToken().token; TOKEN_TS = Date.now(); }
  return TOKEN;
}
async function call(url, params, method='GET'){
  const u = new URL(url);
  if (method === 'GET') for (const [k,v] of Object.entries(params||{})) u.searchParams.set(k,v);
  const init = { method, headers: { ...headers(fresh()), ...(method==='POST'?{'Content-Type':'application/x-www-form-urlencoded'}:{}) }, signal: AbortSignal.timeout(25000) };
  if (method === 'POST') init.body = new URLSearchParams(params||{}).toString();
  const r = await fetch(u, init);
  const j = await r.json().catch(()=>({http:r.status}));
  if (j.status && j.status !== 200) throw new Error(`[${j.status}] ${j.message}`);
  return j.data !== undefined ? j.data : j;
}

const strip = s => (s||'').replace(/<[^>]+>/g,'').replace(/&[a-z]+;/g,' ').trim();
const short = (s,n=60) => (s||'').length>n ? s.slice(0,n)+'…' : (s||'');

const cmd = process.argv[2];
try {
  if (cmd === 'hot') {
    const d = await call(API+'/v6/main/indexV8', {page:'1'});
    let n=0;
    for (const card of d) {
      for (const e of (card.entities||[])) {
        if (e.entityType === 'feed' && n < 12) {
          n++;
          console.log(`· ${short(strip(e.message||e.title),70)}`);
          console.log(`  @${e.username||'?'}  👍${e.likenum||0}  💬${e.replynum||0}  id=${e.id}`);
        }
      }
    }
    console.log(`\n共 ${n} 条`);
  } else if (cmd === 'search') {
    const kw = process.argv[3]; const page = process.argv[4]||'1';
    const d = await call(API+'/v6/search', {type:'feed', searchValue:kw, page, showAnonymous:'-1', category:''});
    for (const e of (d||[]).slice(0,10)) {
      console.log(`· ${short(strip(e.message||e.title),70)}`);
      console.log(`  @${e.username||'?'}  👍${e.likenum||0}  💬${e.replynum||0}  id=${e.id}`);
    }
    console.log(`\n命中 ${(d||[]).length} 条`);
  } else if (cmd === 'feed') {
    const d = await call(API2+'/v6/feed/detail', {id:process.argv[3]}, 'GET');
    console.log('标题:', strip(d.title));
    console.log('作者:', d.username, '| 赞', d.likenum, '| 评', d.replynum, '|', new Date(d.dateline*1000).toLocaleString('zh-CN'));
    console.log('----');
    console.log(strip(d.message).slice(0,800));
    console.log('----');
    console.log('图片:', (d.picArr||[]).length, '张');
  } else if (cmd === 'replies') {
    const d = await call(API2+'/v6/feed/replyList', {id:process.argv[3], listType:'lastupdate_desc', page:process.argv[4]||'1', discussMode:1, feedType:'feed', blockStatus:'0', fromFeedAuthor:'0'});
    for (const c of (d||[]).slice(0,8)) console.log(`@${c.username}: ${short(strip(c.message),80)}  👍${c.likenum||0}`);
  } else {
    console.log('usage: ck.mjs hot | search <kw> [page] | feed <id> | replies <id> [page]');
  }
} catch(e) { console.error('ERR', e.message); }
