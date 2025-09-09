// Link da planilha (CSV)
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9b2FKBRe00ngdkBE8bSiC47MDdGJROwM-6FtxRy8htDIev5BZ5Z-SyxAXtz_2KzLxyHn-MiEcJaCj/pub?gid=784473971&single=true&output=csv";

// Proxy para evitar erro de CORS
const PROXY_URL =
  "https://api.allorigins.win/raw?url=" + encodeURIComponent(SHEET_URL);

const fichaContainer = document.getElementById("ficha");
const treinoSelect = document.getElementById("treinoSelect");

async function carregarFicha() {
  try {
    const res = await fetch(PROXY_URL);
    if (!res.ok) throw new Error("Falha ao buscar planilha");
    const csv = await res.text();

    const parsed = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
    });

    const rows = parsed.data;
    if (!rows || rows.length === 0) throw new Error("Planilha vazia");

    // Preencher filtro de treinos
    const treinos = [...new Set(rows.map(r => r["Treino"]).filter(Boolean))];
    treinoSelect.innerHTML = `<option value="Todos">Todos</option>`;
    treinos.forEach(t => {
      treinoSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });

    // Render inicial
    renderExercicios(rows);

    treinoSelect.addEventListener("change", () => {
      const filtro = treinoSelect.value;
      const filtrados = filtro === "Todos" ? rows : rows.filter(r => r["Treino"] === filtro);
      renderExercicios(filtrados);
    });
  } catch (err) {
    console.error(err);
    fichaContainer.innerHTML = `<p>Erro ao carregar ficha 😢</p><p>Verifique se a planilha está publicada corretamente.</p>`;
  }
}

function renderExercicios(lista) {
  fichaContainer.innerHTML = "";
  if (!lista.length) {
    fichaContainer.innerHTML = "<p>Nenhum exercício encontrado.</p>";
    return;
  }

  lista.forEach(ex => {
    const div = document.createElement("div");
    div.className = "exercicio";

    // Usar imagem ilustrativa (pesquisa no DuckDuckGo sem CORS bloqueado)
    const imgUrl = `https://source.unsplash.com/400x300/?gym,${encodeURIComponent(ex["Exercício"] || "workout")}`;

    div.innerHTML = `
      <h3>${ex["Exercício"] || "Sem nome"}</h3>
      <p><b>Grupo:</b> ${ex["Grupo Muscular"] || "-"}</p>
      <p><b>Séries:</b> ${ex["Séries"] || "-"}</p>
      <p><b>Reps:</b> ${ex["Reps"] || "-"}</p>
      <p><b>Execução/Técnica:</b> ${ex["Execução / Técnica"] || "-"}</p>
      <p><b>Observações:</b> ${ex["Observações"] || "-"}</p>
      <p><b>Carga (kg):</b> <input type="number" min="0" value="${ex["Carga (kg)"] || 0}"></p>
      <img src="${imgUrl}" alt="Exemplo de ${ex["Exercício"]}">
    `;

    // Botão concluir
    const btnConcluir = document.createElement("button");
    btnConcluir.textContent = "✔ Concluir";
    btnConcluir.onclick = () => {
      div.classList.toggle("concluido");
    };
    div.appendChild(btnConcluir);

    // Botão cronômetro só se houver descanso
    if (ex["Descanso (s)"]) {
      const btnTimer = document.createElement("button");
      btnTimer.textContent = `⏱ Descanso ${ex["Descanso (s)"]}s`;
      btnTimer.onclick = () => iniciarTimer(ex["Descanso (s)"], btnTimer);
      div.appendChild(btnTimer);
    }

    fichaContainer.appendChild(div);
  });
}

function iniciarTimer(segundos, botao) {
  let restante = segundos;
  botao.disabled = true;
  botao.textContent = `⏱ ${restante}s`;

  const interval = setInterval(() => {
    restante--;
    botao.textContent = `⏱ ${restante}s`;
    if (restante <= 0) {
      clearInterval(interval);
      botao.textContent = "✅ Descanso finalizado!";
      setTimeout(() => {
        botao.disabled = false;
        botao.textContent = `⏱ Descanso ${segundos}s`;
      }, 2000);
    }
  }, 1000);
}

carregarFicha();
