const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9b2FKBRe00ngdkBE8bSiC47MDdGJROwM-6FtxRy8htDIev5BZ5Z-SyxAXtz_2KzLxyHn-MiEcJaCj/pub?gid=784473971&single=true&output=csv";
const fichaContainer = document.getElementById("ficha-container");

// Banco de imagens por nome de exercício
const exercicioImgs = {
  "Supino reto": "https://www.mundoboaforma.com.br/wp-content/uploads/2015/02/supino-reto-barra.jpg",
  "Agachamento livre": "https://www.mundoboaforma.com.br/wp-content/uploads/2016/07/agachamento-livre.jpg",
  "Puxada frente": "https://www.mundoboaforma.com.br/wp-content/uploads/2019/03/puxada-frente-barra.jpg",
  "Rosca direta": "https://www.mundoboaforma.com.br/wp-content/uploads/2017/11/rosca-direta-barra.jpg",
  "Elevação lateral": "https://www.mundoboaforma.com.br/wp-content/uploads/2017/08/elevacao-lateral.jpg"
};

const imgDefault = "https://images.unsplash.com/photo-1517964104185-48c7ba0a78f4?auto=format&fit=crop&w=800&q=80";

async function carregarFicha() {
  try {
    const res = await fetch(SHEET_URL);
    const csv = await res.text();
    const rows = csv.split("\n").map(r => r.split(","));
    rows.shift(); // Remove cabeçalho
    
    const treinos = {};
    rows.forEach(r => {
      const treino = r[0];
      if (!treinos[treino]) treinos[treino] = [];
      treinos[treino].push(r);
    });

    fichaContainer.innerHTML = "";
    Object.entries(treinos).forEach(([treino, exercicios]) => {
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

        card.querySelector(`#carga_${id}`).addEventListener("change", e => {
          localStorage.setItem(`carga_${id}`, e.target.value);
        });

        const btnDone = card.querySelector(".done");
        btnDone.addEventListener("click", () => {
          const novo = !(localStorage.getItem(`done_${id}`) === "true");
          localStorage.setItem(`done_${id}`, novo);
          btnDone.textContent = novo ? "✅ Concluído" : "Marcar concluído";
        });

        const btnTimer = card.querySelector(".timer");
        const timerSpan = card.querySelector(`#timer_${id}`);
        let timer;
        btnTimer.addEventListener("click", () => {
          clearInterval(timer);
          let tempo = parseInt(descanso);
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

  } catch (e) {
    fichaContainer.innerHTML = "Erro ao carregar ficha 😢";
    console.error(e);
  }
}

carregarFicha();
