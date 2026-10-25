/**
 * =====================================================================
 * MENU.JS - PAINEL "IR PARA" E INICIALIZAÇÃO FINAL
 * =====================================================================
 *
 * O botão ☰ (canto superior direito) abre um painel lateral com todas as
 * páginas: Capa, Índice e cada categoria. Tocar num item pula direto
 * para a página (irParaPaginaInstant, em src/js/livro.js).
 *
 * Este é o ÚLTIMO arquivo do <script>: no fim ele mostra o livro já
 * montado (classe "ready"), o que evita o "pisca" de uma página vazia
 * no celular enquanto o JS ainda trabalhava.
 * =====================================================================
 */

const menuBtn = document.getElementById("menuBtn");
const menuOverlay = document.getElementById("menuOverlay");
const menuPanel = document.getElementById("menuPanel");
const menuClose = document.getElementById("menuClose");
const menuList = document.getElementById("menuList");

/** Itens do menu: capa, índice e uma entrada por categoria (página = i + 2). */
const ITENS_MENU = [
    { pagina: 0, icone: "📕", label: "Capa" },
    { pagina: 1, icone: "📖", label: "Índice" },
    ...CATEGORIAS.map((cat, i) => ({ pagina: i + 2, icone: cat.icone, label: cat.nome }))
];

menuList.innerHTML = ITENS_MENU.map(item => `
  <button class="menu-panel__item" data-goto-menu="${item.pagina}">
    <span class="menu-panel__item-icon">${esc(item.icone)}</span>
    <span class="menu-panel__item-label">${esc(item.label)}</span>
    <span class="menu-panel__item-page">pág. ${item.pagina + 1}</span>
  </button>
`).join("");

/** Destaca no menu a página que está aberta agora. */
function destacarItemMenuAtivo() {
    menuList.querySelectorAll("[data-goto-menu]").forEach(btn => {
        btn.classList.toggle("active", Number(btn.dataset.gotoMenu) === atual);
    });
}

/** Abre o painel lateral. */
function abrirMenu() {
    menuOverlay.classList.add("show");
    menuPanel.classList.add("open");
}

/** Fecha o painel lateral. */
function fecharMenu() {
    menuOverlay.classList.remove("show");
    menuPanel.classList.remove("open");
}

menuBtn.addEventListener("click", abrirMenu);
menuClose.addEventListener("click", fecharMenu);
menuOverlay.addEventListener("click", fecharMenu); // clicar fora também fecha
menuList.addEventListener("click", (e) => {
    const item = e.target.closest("[data-goto-menu]");
    if (item) irParaPaginaInstant(Number(item.dataset.gotoMenu));
});

/* ---------------------------------------------------------------------
   INICIALIZAÇÃO FINAL
   --------------------------------------------------------------------- */
atualizarIndicador();

// Revela o livro só agora, já com todas as páginas montadas
document.querySelector(".stage").classList.add("ready");
