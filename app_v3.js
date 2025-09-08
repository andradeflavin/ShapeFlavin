
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vStuw0swMB-_z08xjeGlKFAuXnBL5GI8HXeFHnSfUAryM0i6PH2MFZ0ys4or25YIQ/pub?gid=784473971&single=true&output=csv";

function slug(s){
  if(!s) return 'default';
  return s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

async function fetchSheet(){
  const res = await fetch(SHEET_CSV);
  const txt = await res.text();
  const parsed = Papa.parse(txt.trim(), {header: true, skipEmptyLines: true});
  return parsed.data;
}

function isImageAvailable(path){
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = path;
  });
}

function formatDateTimeISO(){
  const now = new Date();
  return now.toLocaleString('pt-BR');
}

function getStorageKey(exercicio){
  return 'treino:carga:' + exercicio;
}

function saveLocal(exercicio, carga){
  const payload = { carga: carga, data: formatDateTimeISO() };
  localStorage.setItem(getStorageKey(exercicio), JSON.stringify(payload));
}

function loadLocal(exercicio){
  try{
    return JSON.parse(localStorage.getItem(getStorageKey(exercicio)) || '{}');
  }catch(e){ return {}; }
}

function startTimer(displayEl, seconds){
  let time = Number(seconds) || 0;
  displayEl.textContent = `⏱️ Descanso: ${time}s`;
  const iv = setInterval(()=>{
    time--;
    if(time <= 0){
      displayEl.textContent = '✅ Descanso finalizado';
      clearInterval(iv);
    } else {
      displayEl.textContent = `⏱️ Descanso: ${time}s`;
    }
  },1000);
  return iv;
}

async function render(){
  const data = await fetchSheet();
  const rows = data.map(r => {
    const norm = {};
    for(const k in r) norm[k.trim()] = (r[k]||'').trim();
    return norm;
  });

  const treinoSelect = document.getElementById('filter-treino');
  const grupoSelect = document.getElementById('filter-grupo');
  const search = document.getElementById('search');
  const cards = document.getElementById('cards');

  const treinos = Array.from(new Set(rows.map(r => r['Treino']).filter(Boolean)));
  const grupos = Array.from(new Set(rows.map(r => r['Grupo Muscular']).filter(Boolean)));
  treinoSelect.innerHTML = '<option value="">Todos os Treinos</option>' + treinos.map(t=>`<option>${t}</option>`).join('');
  grupoSelect.innerHTML = '<option value="">Todos os Grupos</option>' + grupos.map(g=>`<option>${g}</option>`).join('');

  function filterAndRender(){
    const tVal = treinoSelect.value;
    const gVal = grupoSelect.value;
    const q = search.value.trim().toLowerCase();
    cards.innerHTML = '';
    const filtered = rows.filter(r => {
      if(tVal && r['Treino'] !== tVal) return false;
      if(gVal && r['Grupo Muscular'] !== gVal) return false;
      if(q){
        const hay = ((r['Exercício']||'') + ' ' + (r['Execução / Técnica']||'') + ' ' + (r['Observações']||'')).toLowerCase();
        return hay.includes(q);
      }
      return true;
    });

    if(filtered.length === 0){
      cards.innerHTML = '<div class="empty">Nenhum exercício encontrado.</div>'; return;
    }

    filtered.forEach(async (r, idx) => {
      const key = r['Exercício'] || ('ex-' + idx);
      const saved = loadLocal(key);
      const imgName = slug(r['Grupo Muscular'] || r['Exercício']);
      const imgPath = 'images/' + imgName + '.svg';
      const exists = await isImageAvailable(imgPath);
      const finalImg = exists ? imgPath : 'images/default.svg';

      const card = document.createElement('div'); card.className = 'card';
      card.innerHTML = `
        <div class="card-left">
          <img src="${finalImg}" alt="${r['Grupo Muscular'] || ''}" loading="lazy" />
          <div class="meta small-note">${r['Treino'] || ''}</div>
        </div>
        <div class="card-body">
          <h3>${r['Exercício'] || ''}</h3>
          <div class="meta">${r['Grupo Muscular'] || ''}</div>
          <div class="card-row"><div><strong>Séries:</strong> ${r['Séries'] || ''}</div><div><strong>Reps:</strong> ${r['Reps'] || ''}</div><div><strong>Descanso:</strong> ${r['Descanso (s)'] || ''}s</div></div>
          <p class="small-note"><strong>Execução:</strong> ${r['Execução / Técnica'] || ''}</p>
          <p class="small-note"><strong>Obs:</strong> ${r['Observações'] || ''}</p>
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
        card.querySelector('.small-note').textContent = 'Última vez: ' + (new Date()).toLocaleString('pt-BR');
        const timerEl = document.getElementById('t-' + encodeURIComponent(key));
        if(timerEl._iv) clearInterval(timerEl._iv);
        const secs = Number(r['Descanso (s)']) || 60;
        timerEl._iv = startTimer(timerEl, secs);
      });
    });
  }

  treinoSelect.addEventListener('change', filterAndRender);
  grupoSelect.addEventListener('change', filterAndRender);
  search.addEventListener('input', filterAndRender);
  filterAndRender();

  document.getElementById('resetCargas').addEventListener('click', ()=>{
    if(confirm('Limpar todas as cargas salvas localmente?')){
      Object.keys(localStorage).forEach(k=>{ if(k.startsWith('treino:carga:')) localStorage.removeItem(k); });
      filterAndRender();
    }
  });
}

document.addEventListener('DOMContentLoaded', ()=>{ render().catch(e=>{ console.error(e); const cards = document.getElementById('cards'); cards.innerHTML = '<div class="empty">Erro ao carregar dados. Verifique o link da planilha.</div>'; }); });
