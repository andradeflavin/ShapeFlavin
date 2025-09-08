const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vStuw0swMB-_z08xjeGlKFAuXnBL5GI8HXeFHnSfUAryM0i6PH2MFZ0ys4or25YIQ/pub?gid=784473971&single=true&output=csv";

async function carregarTreino() {
  const response = await fetch(sheetUrl);
  const data = await response.text();
  const rows = data.split("\n").map(r => r.split(","));
  const headers = rows.shift();

  const treinoContainer = document.getElementById("treinoContainer");
  treinoContainer.innerHTML = "";

  // Filtros
  const treinoFilter = document.getElementById("treinoFilter");
  const grupoFilter = document.getElementById("grupoFilter");
  const treinos = [...new Set(rows.map(r => r[0]))];
  const grupos = [...new Set(rows.map(r => r[1]))];
  treinoFilter.innerHTML = '<option value="">Todos os Treinos</option>' + treinos.map(t => `<option value="${t}">${t}</option>`).join("");
  grupoFilter.innerHTML = '<option value="">Todos os Grupos</option>' + grupos.map(g => `<option value="${g}">${g}</option>`).join("");

  function render() {
    const treinoVal = treinoFilter.value;
    const grupoVal = grupoFilter.value;
    treinoContainer.innerHTML = "";

    rows.forEach(r => {
      if ((treinoVal && r[0] !== treinoVal) || (grupoVal && r[1] !== grupoVal)) return;

      const key = r[2];
      const savedData = JSON.parse(localStorage.getItem(key) || "{}");

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3>${r[2]} (${r[1]})</h3>
        <p><strong>Séries:</strong> ${r[3]} | <strong>Reps:</strong> ${r[4]} | <strong>Descanso:</strong> ${r[5]}s</p>
        <p><strong>Execução:</strong> ${r[6]}</p>
        <p><strong>Obs:</strong> ${r[7]}</p>
        <img src="images/${r[1].toLowerCase()}.png" alt="${r[1]}">
        <div>
          <label>Carga (kg): </label>
          <input type="number" id="carga-${key}" value="${savedData.carga || ""}">
          <button onclick="salvarCarga('${key}', ${r[5]})">Salvar</button>
        </div>
        <p><small>Última vez: ${savedData.data || "nunca"}</small></p>
        <div id="timer-${key}" class="timer"></div>
      `;
      treinoContainer.appendChild(card);
    });
  }

  treinoFilter.onchange = render;
  grupoFilter.onchange = render;
  render();
}

function salvarCarga(exercicio, descanso) {
  const carga = document.getElementById(`carga-${exercicio}`).value;
  const data = new Date().toLocaleDateString("pt-BR");
  localStorage.setItem(exercicio, JSON.stringify({ carga, data }));

  const timerDiv = document.getElementById(`timer-${exercicio}`);
  let tempo = descanso;
  const interval = setInterval(() => {
    if (tempo <= 0) {
      timerDiv.textContent = "Descanso finalizado!";
      clearInterval(interval);
    } else {
      timerDiv.textContent = `⏱️ Descanso: ${tempo}s`;
      tempo--;
    }
  }, 1000);

  carregarTreino();
}

document.getElementById("resetCargas").onclick = () => {
  localStorage.clear();
  carregarTreino();
};

carregarTreino();
