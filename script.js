const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9b2FKBRe00ngdkBE8bSiC47MDdGJROwM-6FtxRy8htDIev5BZ5Z-SyxAXtz_2KzLxyHn-MiEcJaCj/pub?gid=784473971&single=true&output=csv";

const fichaContainer = document.getElementById("ficha-container");
const filtroTreino = document.getElementById("filtroTreino");

let treinos = {};

async function carregarFicha() {
  try {
    const res = await fetch(SHEET_URL);
    const csv = await res.text();

    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      trimHeaders: true,
    });

    const rows = parsed.data;

    treinos = {};
    rows.forEach((r) => {
      const treino = r["Treino"] || "Sem nome";
      if (!treinos[treino]) treinos[treino] = [];
      treinos[treino].push(r);
    });

    preencherFiltro();
    renderizarFicha();
  } catch (e) {
    fichaContainer.innerHTML = "Erro ao carregar ficha 😢";
    console.error("Erro no parsing:", e);
  }
}

function preencherFiltro() {
  const nomes = Object.keys(treinos);
  filtroTreino.innerHTML = `<option value="todos">Todos</option>`;
  nomes.forEach((n) => {
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

    exercicios.forEach((ex) => {
      const nome = ex["Exercício"] || "Sem nome";
      const id = nome.replace(/\s+/g, "_");

      const cargaSalva =
        localStorage.getItem(`carga_${id}`) || ex["Carga (kg)"] || "";
      const concluido = localStorage.getItem(`done_${id}`) === "true";

      // imagem dinâmica do Unsplash
      const imgUrl = `https://source.unsplash.com/400x300/?gym,${encodeURIComponent(
        nome
      )}`;

      const card = document.createElement("div");
      card.className = "card";
      if (concluido) card.classList.add("done");

      card.innerHTML = `
        <img src="${imgUrl}" alt="Exercício ${nome}">
        <h3>${nome}</h3>
        <small>${ex["Grupo"] || "-"} - ${ex["Muscular"] || "-"}</small>
        <p><b>Séries:</b> ${ex["Séries"] || "-"} | <b>Reps:</b> ${
        ex["Reps"] || "-"
      }</p>
        <p><b>Execução:</b> ${ex["Execução / Técnica"] || "-"}<br>
           <b>Obs:</b> ${ex["Observações"] || "-"}</p>
        <label>Carga (kg): <input type="number" id="carga_${id}" value="${cargaSalva}"></label>
        <br>
        <button class="done">${concluido ? "✅ Concluído" : "Marcar concluído"}</button>
        <div class="timer-container" id="timerBox_${id}"></div>
      `;

      // salvar carga
      card.querySelector(`#carga_${id}`).addEventListener("change", (e) => {
        localStorage.setItem(`carga_${id}`, e.target.value);
      });

      // marcar concluído
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

      // cronômetro só se houver descanso
      const descanso = parseInt(ex["Descanso (s)"]);
      if (!isNaN(descanso) && descanso > 0) {
        const timerBox = card.querySelector(`#timerBox_${id}`);
        timerBox.innerHTML = `
          <button class="timer">⏱ Iniciar descanso (${descanso}s)</button>
          <span id="timer_${id}"></span>
        `;

        const btnTimer = timerBox.querySelector(".timer");
        const timerSpan = timerBox.querySelector(`#timer_${id}`);
        let timer;

        btnTimer.addEventListener("click", () => {
          clearInterval(timer);
          let tempo = descanso;
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
      }

      div.appendChild(card);
    });

    fichaContainer.appendChild(div);
  });
}

carregarFicha();
