const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9b2FKBRe00ngdkBE8bSiC47MDdGJROwM-6FtxRy8htDIev5BZ5Z-SyxAXtz_2KzLxyHn-MiEcJaCj/pub?gid=784473971&single=true&output=csv";

const exerciciosDiv = document.getElementById("exercicios");
const filterGrupo = document.getElementById("filterGrupo");
const filterDia = document.getElementById("filterDia");
const searchInput = document.getElementById("searchInput");
const resetBtn = document.getElementById("resetBtn");

let exercicios = [];

async function carregarCSV() {
  try {
    const res = await fetch(SHEET_URL);
    if (!res.ok) throw new Error("Erro ao carregar CSV: " + res.status);
    const text = await res.text();

    // Detecta delimitador
    const delimitador = text.includes(";") ? ";" : ",";
    const linhas = text.trim().split(/\r?\n/).map(l => l.split(delimitador));

    const headers = linhas[0].map(h => h.trim());
    exercicios = linhas.slice(1).map(l => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = l[i] || "");
      return obj;
    });

    popularFiltros();
    renderizar();
  } catch (err) {
    console.error("Falha:", err);
    exerciciosDiv.innerHTML = `<p style='color:red'>Erro ao carregar dados. Verifique se a planilha está pública.</p>`;
  }
}

function popularFiltros() {
  const grupos = [...new Set(exercicios.map(e => e.Grupo).filter(Boolean))];
  const dias = [...new Set(exercicios.map(e => e.Dia).filter(Boolean))];

  filterGrupo.innerHTML = "<option value=''>Todos Grupos</option>" + grupos.map(g => `<option>${g}</option>`).join("");
  filterDia.innerHTML = "<option value=''>Todos Dias</option>" + dias.map(d => `<option>${d}</option>`).join("");
}

function renderizar() {
  const g = filterGrupo.value.toLowerCase();
  const d = filterDia.value.toLowerCase();
  const s = searchInput.value.toLowerCase();

  const filtrados = exercicios.filter(e =>
    (!g || (e.Grupo || '').toLowerCase() === g) &&
    (!d || (e.Dia || '').toLowerCase() === d) &&
    (!s || Object.values(e).some(v => (v || '').toLowerCase().includes(s)))
  );

  exerciciosDiv.innerHTML = filtrados.map(e => {
    const img = `images/${(e.Grupo || 'default').toLowerCase()}.svg`;
    return `
      <div class="card">
        <img src="${img}" alt="${e.Grupo}" onerror="this.src='images/default.svg'"/>
        <div>
          <strong>${e.Exercicio || "Sem nome"}</strong><br/>
          <small>${e.Series || ""} séries • ${e.Repeticoes || ""} reps</small><br/>
          <em>${e.Observacao || ""}</em>
        </div>
      </div>`;
  }).join("");
}

filterGrupo.addEventListener("change", renderizar);
filterDia.addEventListener("change", renderizar);
searchInput.addEventListener("input", renderizar);
resetBtn.addEventListener("click", () => {
  filterGrupo.value = "";
  filterDia.value = "";
  searchInput.value = "";
  renderizar();
});

carregarCSV();
