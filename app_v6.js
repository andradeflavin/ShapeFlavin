
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9b2FKBRe00ngdkBE8bSiC47MDdGJROwM-6FtxRy8htDIev5BZ5Z-SyxAXtz_2KzLxyHn-MiEcJaCj/pub?gid=784473971&single=true&output=csv";

function normalizeKey(k){ return k.toString().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase(); }
function detectDelimiter(sample){
  const candidates = [',',';','\t','|'];
  const lines = sample.split(/\r?\n/).slice(0,6);
  let best = {c:', score:-Infinity};
  for(const c of candidates){
    const counts = lines.map(l => (l.match(new RegExp('\\' + c,'g'))||[]).length);
    const avg = counts.reduce((a,b)=>a+b,0)/counts.length;
    const variance = counts.reduce((a,b)=>a+Math.pow(b-avg,2),0)/counts.length;
    const score = avg - variance;
    if(score > best.score) best = {c, score};
  }
  return best.c;
}
function mapHeaders(headers){
  const map = {};
  headers.forEach((h, idx) => {
    const n = normalizeKey(h);
    if(n.includes('treino')) map['Treino'] = idx;
    else if(n.includes('grupo')) map['Grupo Muscular'] = idx;
    else if(n.includes('exer') || n.includes('nome')) map['Exercício'] = idx;
    else if(n.includes('serie')) map['Séries'] = idx;
    else if(n.includes('rep')) map['Reps'] = idx;
    else if(n.includes('descans')) map['Descanso (s)'] = idx;
    else if(n.includes('exec') || n.includes('tecn')) map['Execução / Técnica'] = idx;
    else if(n.includes('observ')) map['Observações'] = idx;
    else if(n.includes('data')) map['Data do registro'] = idx;
    else if(n.includes('carga')) map['Carga (kg)'] = idx;
    else map[h] = idx;
  });
  return map;
}
function formatDateTime(){ return new Date().toLocaleString('pt-BR'); }
function storageKey(ex){ return 'treino:carga:' + ex; }
function saveLocal(ex,c){ localStorage.setItem(storageKey(ex), JSON.stringify({carga:c, data: formatDateTime()})); }
function loadLocal(ex){ try{return JSON.parse(localStorage.getItem(storageKey(ex))||'{}');}catch(e){return {}; } }
function startTimer(el, seconds){ let t = Number(seconds)||0; el.textContent = `⏱️ Descanso: ${t}s`; const iv = setInterval(()=>{ t--; if(t<=0){ el.textContent='✅ Descanso finalizado'; clearInterval(iv);} else el.textContent = `⏱️ Descanso: ${t}s`; },1000); return iv; }

// Try decoding ArrayBuffer with UTF-8 (fatal) then fallback to windows-1252
async function fetchAndDecode(url){
  const res = await fetch(url, {mode:'cors', cache:'no-store'});
  if(!res.ok) throw new Error('HTTP ' + res.status);
  const buf = await res.arrayBuffer();
  // try UTF-8 (fatal=true will throw on invalid sequences)
  try{
    const dec = new TextDecoder('utf-8', {fatal:true});
    return dec.decode(buf);
  }catch(e){
    // fallback to windows-1252 / iso-8859-1
    try{
      const dec2 = new TextDecoder('windows-1252');
      return dec2.decode(buf);
    }catch(e2){
      // last fallback - latin1
      const dec3 = new TextDecoder('iso-8859-1');
      return dec3.decode(buf);
    }
  }
}

async function fetchCSV(url){
  const txt = await fetchAndDecode(url);
  if(!txt || txt.trim().length === 0) throw new Error('CSV vazio');
  const delim = detectDelimiter(txt.slice(0,2000));
  const parsed = Papa.parse(txt, {header:false, skipEmptyLines:true, delimiter: delim});
  return parsed.data;
}

async function render(){
  const cards = document.getElementById('cards');
  cards.innerHTML = '<div class="empty">Carregando...</div>';
  try{
    const data = await fetchCSV(SHEET_CSV);
    const headers = data[0].map(h=>h.toString().trim());
    const mapping = mapHeaders(headers);
    const rows = data.slice(1).map(r => {
      const obj = {};
      for(const key in mapping){
        const idx = mapping[key];
        obj[key] = r[idx] ? r[idx].toString().trim() : '';
      }
      return obj;
    });

    const treinoSel = document.getElementById('filter-treino');
    const grupoSel = document.getElementById('filter-grupo');
    const search = document.getElementById('search');
    const treinos = Array.from(new Set(rows.map(r=>r['Treino']).filter(Boolean)));
    const grupos = Array.from(new Set(rows.map(r=>r['Grupo Muscular']).filter(Boolean)));
    treinoSel.innerHTML = '<option value="">Todos os Treinos</option>' + treinos.map(t=>`<option value="${t}">${t}</option>`).join('');
    grupoSel.innerHTML = '<option value="">Todos os Grupos</option>' + grupos.map(g=>`<option value="${g}">${g}</option>`).join('');

    function filterAndRender(){
      const tVal = treinoSel.value;
      const gVal = grupoSel.value;
      const q = (search.value||'').toLowerCase();
      cards.innerHTML = '';
      const filtered = rows.filter(r => {
        if(tVal && r['Treino'] !== tVal) return false;
        if(gVal && r['Grupo Muscular'] !== gVal) return false;
        if(q){
          const hay = (r['Exercício']||'') + ' ' + (r['Execução / Técnica']||'') + ' ' + (r['Observações']||'');
          return hay.toLowerCase().includes(q);
        }
        return true;
      });
      if(filtered.length === 0){ cards.innerHTML = '<div class="empty">Nenhum exercício encontrado.</div>'; return; }

      filtered.forEach((r, idx) => {
        const key = r['Exercício'] || ('ex-' + idx);
        const saved = loadLocal(key);
        const imgName = (r['Grupo Muscular']||'default').toLowerCase().replace(/[^a-z0-9]+/g,'-');
        const imgPath = 'images/' + imgName + '.svg';
        const card = document.createElement('div'); card.className = 'card';
        card.innerHTML = `
          <div class="card-left">
            <img src="${imgPath}" alt="${r['Grupo Muscular']||''}" loading="lazy" onerror="this.src='images/default.svg'"/>
            <div class="meta small-note">${r['Treino']||''}</div>
          </div>
          <div class="card-body">
            <h3>${r['Exercício']||''}</h3>
            <div class="meta">${r['Grupo Muscular']||''}</div>
            <div class="card-row"><div><strong>Séries:</strong> ${r['Séries']||''}</div><div><strong>Reps:</strong> ${r['Reps']||''}</div><div><strong>Descanso:</strong> ${r['Descanso (s)']||''}s</div></div>
            <p class="small-note"><strong>Execução:</strong> ${r['Execução / Técnica']||''}</p>
            <p class="small-note"><strong>Obs:</strong> ${r['Observações']||''}</p>
            <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <input class="input-carga" id="c-${encodeURIComponent(key)}" type="number" placeholder="kg" value="${saved.carga||''}" />
              <button class="btn-save" id="s-${encodeURIComponent(key)}">Salvar</button>
              <div id="t-${encodeURIComponent(key)}" class="timer"></div>
            </div>
            <div class="small-note">Última vez: ${saved.data||'nunca'}</div>
          </div>
        `;
        cards.appendChild(card);

        document.getElementById('s-' + encodeURIComponent(key)).addEventListener('click', ()=>{
          const val = document.getElementById('c-' + encodeURIComponent(key)).value;
          saveLocal(key, val);
          card.querySelector('.small-note').textContent = 'Última vez: ' + formatDateTime();
          const timerEl = document.getElementById('t-' + encodeURIComponent(key));
          if(timerEl._iv) clearInterval(timerEl._iv);
          timerEl._iv = startTimer(timerEl, Number(r['Descanso (s)']) || 60);
        });
      });
    }

    treinoSel.addEventListener('change', filterAndRender);
    grupoSel.addEventListener('change', filterAndRender);
    search.addEventListener('input', filterAndRender);
    filterAndRender();

    document.getElementById('resetCargas').addEventListener('click', ()=>{
      if(confirm('Limpar todas as cargas salvas localmente?')){
        Object.keys(localStorage).forEach(k=>{ if(k.startsWith('treino:carga:')) localStorage.removeItem(k); });
        render();
      }
    });

  } catch(err){
    console.error(err);
    cards.innerHTML = `<div class="empty">Erro ao carregar a ficha: ${err.message}. <br/>Tente abrir o CSV diretamente: <a href="${SHEET_CSV}" target="_blank" rel="noreferrer">Abrir CSV</a></div>`;
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  if(typeof Papa === 'undefined'){
    const cards = document.getElementById('cards');
    cards.innerHTML = '<div class="empty">Biblioteca PapaParse não encontrada. Verifique index.html.</div>';
    return;
  }
  render();
});
