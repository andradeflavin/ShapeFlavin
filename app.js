// app_v4.js - versão mais robusta
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vStuw0swMB-_z08xjeGlKFAuXnBL5GI8HXeFHnSfUAryM0i6PH2MFZ0ys4or25YIQ/pub?gid=784473971&single=true&output=csv";

// -- utilitários --
function slug(s){ if(!s) return 'default'; return s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function formatDateTime(){ return new Date().toLocaleString('pt-BR'); }
function getStorageKey(ex){ return 'treino:carga:' + ex; }
function saveLocal(ex, carga){ localStorage.setItem(getStorageKey(ex), JSON.stringify({carga: carga, data: formatDateTime()})); }
function loadLocal(ex){ try{return JSON.parse(localStorage.getItem(getStorageKey(ex))||'{}');}catch(e){return {}; } }
function startTimer(el, seconds){ let t = Number(seconds)||0; el.textContent = `⏱️ Descanso: ${t}s`; const iv = setInterval(()=>{ t--; if(t<=0){ el.textContent='✅ Descanso finalizado'; clearInterval(iv);} else el.textContent = `⏱️ Descanso: ${t}s`; }, 1000); return iv; }

// detecta delimitador em amostra do CSV
function detectDelimiter(sample){
  const candidates = [",",";","\\t","|"];
  let best = {char: ",", score: -1};
  const lines = sample.split(/\r\n|\n/).slice(0,6);
  for(const c of candidates){
    const counts = lines.map(l => (l.match(new RegExp(c,'g'))||[]).length);
    // score = variance + total separators (prefer consistente rows)
    const avg = counts.reduce((a,b)=>a+b,0)/counts.length;
    const variance = counts.reduce((a,b)=>a+Math.pow(b-avg,2),0)/counts.length;
    const score = avg - variance;
    if(score > best.score){ best = {char: c, score}; }
  }
  return best.char;
}

// coloca mensagem de erro/estado na UI
function showMessage(msg){
  const cards = document.getElementById('cards');
  if(cards) cards.innerHTML = `<div class="empty">${msg}</div>`;
}

// fetch + parse wrapper
async function fetchAndParseCSV(url){
  try{
    const res = await fetch(url, {mode:'cors', cache:'no-store'});
    if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const txt = await res.text();
    if(!txt || txt.trim().length===0) throw new Error('CSV vazio retornado pelo Google Sheets.');
    // detect delimiter
    const delimiter = detectDelimiter(txt.slice(0,2000));
    // parse via PapaParse (assume papaparse já carregado)
    const parsed = Papa.parse(txt, {header:true, skipEmptyLines:true, delimiter: (delimiter === "\\t" ? "\t" : delimiter)});
    if(parsed && parsed.data && parsed.data.length>0) return parsed.data;
    throw new Error('Falha ao parsear CSV (formato inesperado).');
  } catch(err){
    throw err;
  }
}

async function render(){
  const cards = document.getElementById('cards');
  showMessage('Carregando ficha...');

  try{
    const rows = await fetchAndParseCSV(SHEET_CSV);

    // normalizar keys (trim)
    const norm = rows.map(r => {
      const o = {};
      for(const k in r) o[k.trim()] = (r[k]||'').trim();
      return o;
    });

    // populares selects
    const treinoSelect = document.getElementById('filter-treino');
    const grupoSelect = document.getElementById('filter-grupo');
    const search = document.getElementById('search');
    const treinos = Array.from(new Set(norm.map(r=>r['Treino']).filter(Boolean)));
    const grupos = Array.from(new Set(norm.map(r=>r['Grupo Muscular']).filter(Boolean)));
    treinoSelect.innerHTML = '<option value="">Todos os Treinos</option>' + treinos.map(t=>`<option>${t}</option>`).join('');
    grupoSelect.innerHTML = '<option value="">Todos os Grupos</option>' + grupos.map(g=>`<option>${g}</option>`).join('');

    function filterAndBuild(){
      const tVal = treinoSelect.value;
      const gVal = grupoSelect.value;
      const q = (search.value||'').toLowerCase();
      cards.innerHTML = '';
      const filtered = norm.filter(r=>{
        if(tVal && r['Treino'] !== tVal) return false;
        if(gVal && r['Grupo Muscular'] !== gVal) return false;
        if(q){
          const hay = ((r['Exercício']||'') + ' ' + (r['Execução / Técnica']||'') + ' ' + (r['Observações']||'')).toLowerCase();
          return hay.includes(q);
        }
        return true;
      });
      if(filtered.length===0){ showMessage('Nenhum exercício encontrado.'); return; }

      filtered.forEach(async (r, idx)=>{
        const key = r['Exercício'] || ('ex-' + idx);
        const saved = loadLocal(key);
        const imgName = slug(r['Grupo Muscular'] || r['Exercício']);
        const imgPath = 'images/' + imgName + '.svg';

        // check image availability - fallback to default.svg
        const exists = await new Promise(res=>{
          const img = new Image();
          img.onload = ()=>res(true);
          img.onerror = ()=>res(false);
          img.src = imgPath;
        });
        const finalImg = exists ? imgPath : 'images/default.svg';

        const card = document.createElement('div'); card.className = 'card';
        card.innerHTML = `
          <div class="card-left">
            <img src="${finalImg}" alt="${r['Grupo Muscular']||''}" loading="lazy" />
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
            <div class="small-note last-note">Última vez: ${saved.data||'nunca'}</div>
          </div>
        `;
        cards.appendChild(card);

        // handlers
        document.getElementById('s-' + encodeURIComponent(key)).addEventListener('click', ()=>{
          const val = document.getElementById('c-' + encodeURIComponent(key)).value;
          saveLocal(key, val);
          const lastNote = card.querySelector('.last-note');
          lastNote.textContent = 'Última vez: ' + formatDateTime();
          const timerEl = document.getElementById('t-' + encodeURIComponent(key));
          if(timerEl._iv) clearInterval(timerEl._iv);
          timerEl._iv = startTimer(timerEl, Number(r['Descanso (s)']) || 60);
        });

      });
    }

    treinoSelect.addEventListener('change', filterAndBuild);
    grupoSelect.addEventListener('change', filterAndBuild);
    search.addEventListener('input', filterAndBuild);
    filterAndBuild();

    // reset
    const btn = document.getElementById('resetCargas');
    btn.onclick = ()=>{ if(confirm('Limpar todas as cargas salvas localmente?')){ Object.keys(localStorage).forEach(k=>{ if(k.startsWith('treino:carga:')) localStorage.removeItem(k); } ); render(); } };

  } catch(err){
    console.error('Erro carregar planilha:', err);
    showMessage(`Erro ao carregar a ficha: ${err.message}. <br> Tente abrir o CSV diretamente: <a href="${SHEET_CSV}" target="_blank" rel="noreferrer">Abrir CSV</a>`);
  }
}

document.addEventListener('DOMContentLoaded', ()=>{ if(typeof Papa === 'undefined'){ showMessage('PapaParse não encontrado. Certifique-se de incluir a lib papaparse.'); } else render(); });
