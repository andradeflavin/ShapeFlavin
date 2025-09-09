const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9b2FKBRe00ngdkBE8bSiC47MDdGJROwM-6FtxRy8htDIev5BZ5Z-SyxAXtz_2KzLxyHn-MiEcJaCj/pub?gid=784473971&single=true&output=csv";
const fichaContainer = document.getElementById("ficha-container");
const filtroTreino = document.getElementById("filtroTreino");

// Banco de imagens confiáveis (Wikimedia/Unsplash com hotlink permitido)
const exercicioImgs = {
  "Supino reto": "https://upload.wikimedia.org/wikipedia/commons/5/53/Bench_Press-2.jpg",
  "Agachamento livre": "https://upload.wikimedia.org/wikipedia/commons/4/42/Squats.gif",
  "Puxada frente": "https://upload.wikimedia.org/wikipedia/commons/f/f6/Lat_pulldown.png",
  "Rosca direta": "https://upload.wikimedia.org/wikipedia/commons/e/e4/Biceps_curl.gif",
  "Elevação lateral": "https://upload.wikimedia.org/wikipedia/commons/4/4d/Lateral_raise.gif"
};

const imgDefault = "https://images.unsplash.com/photo-1517964104185-48c7ba0a78f4?auto=format&fit=crop&w=800&q=80";

let treinos = {};

async function carregarFicha() {
  try {
    const res = await fetch(SHEET_URL);
    const csv = await res.text();
    const rows = csv.split("\n").map(r => r.split(","));
    rows.shift(); // remove cabeçalho

    treinos = {};
    rows.forEach(r => {
      const treino = r[0];
      if (!treinos[treino]) treinos[treino] = [];
      treinos[treino].push(r);
    });

    preencherFiltro();
    renderizarFicha();
  } catch (e) {
    fichaContainer.innerHTML = "Erro ao carregar ficha 😢";
    console.error(e);
  }
}

function preencherFiltro() {
  const nomes = Object.keys(treinos);
  filtroTreino.innerHTML = `<option value="todos">Todos</option>`;
  nomes.forEach(n => {
    filtroTreino.innerHTML += `<option value="${n}">${n}</option>`;
  });

  filtroTreino.addEventListener("change", renderizarFicha);
}

function renderizarFicha() {
  fichaContainer.innerHTML = "";
  const filtro = filtroTreino.value;

  Object.entries(treinos).forEach(([treino, exercicios]) => {
    if (filtro !== "todos" && filtro !== treino) return;

    const div = document.createElement("div");
    div.className = "treino";
    div.innerHTML = `<h2>Treino ${treino}</h2>`;

    exercicios.forEach(ex => {
      const [treino, grupo, musc, nome, series, reps, descanso, tecnica, obs, data, cargaDefault] = ex;
      const id = nome.replace(/\s+/g, "_");

      const cargaSalva = localStorage.getItem(`carga_${id}`) || cargaDefault || "";
      const concluido = localStorage.getItem(`done_${id}`) === "true";
      const imgUrl = exercicioImgs[nome] || imgDefault;

      const card = document.createElement("div");
      card.className = "card";
      if (concluido) card.classList.add("done");

      card.innerHTML = `
        <img src="${imgUrl}" alt="Exercício ${nome}">
        <h3>${nome}</h3>
        <small>${grupo} - ${musc}</small>
        <p><b>Séries:</b> ${series} | <b>Reps:</b> ${reps} | <b>Descanso:</b> ${descanso}s</p>
        <label>Carga (kg): <input type="number" id="carga_${id}" value="${cargaSalva}"></label>
        <br>
        <button class="done">${concluido ? "✅ Concluído" : "Marcar concluído"}</button>
        <button class="timer">⏱ Iniciar descanso</button>
        <span id="timer_${id}"></span>
      `;

      // Salvar carga
      card.querySelector(`#carga_${id}`).addEventListener("change", e => {
        localStorage.setItem(`carga_${id}`, e.target.value);
      });

      // Marcar concluído
      const btnDone = card.querySelector(".done");
      btnDone.addEventListener("click", () => {
        const novo = !(localStorage.getItem(`done_${id}`) === "true");
        localStorage.setItem(`done_${id}`, novo);
        if (novo) {
          card.classList.add("done");
          btnDone.textContent = "✅ Concluído";
        } else {
          card.classList.remove("done");
          btnDone.textContent = "Marcar concluído";
        }
      });

      // Timer de descanso corrigido
      const btnTimer = card.querySelector(".timer");
      const timerSpan = card.querySelector(`#timer_${id}`);
      let timer;

      btnTimer.addEventListener("click", () => {
        clearInterval(timer);
        let tempo = parseInt(descanso);
        if (isNaN(tempo) || tempo <= 0) tempo = 30;
        timerSpan.textContent = `${tempo}s`;
        timer = setInterval(() => {
          tempo--;
          timerSpan.textContent = `${tempo}s`;
          if (tempo <= 0) {
            clearInterval(timer);
            timerSpan.textContent = "✅ Descanso concluído";
          }
        }, 1000);
      });

      div.appendChild(card);
    });

    fichaContainer.appendChild(div);
  });
}

carregarFicha();
