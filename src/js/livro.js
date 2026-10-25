/**
 * =====================================================================
 * LIVRO.JS - COLOCA AS PÁGINAS NA TELA E VIRA AS FOLHAS
 * =====================================================================
 *
 * Como o "livro" funciona:
 *   - todas as páginas ficam empilhadas no mesmo lugar (position:absolute);
 *     a de cima é a página atual (z-index maior);
 *   - virar para a frente = girar a página atual -178° no eixo Y, com a
 *     dobra na lateral esquerda (transform-origin no CSS, seção 4);
 *   - voltar = girar a página anterior de volta para 0°.
 *
 * Formas de navegar: setas ‹ ›, teclado (← →), arrastar para o lado no
 * celular, índice (data-goto) e menu "Ir para" (src/js/menu.js).
 *
 * Usa montarPaginas() (src/js/paginas.js) e, do menu, fecharMenu() e
 * destacarItemMenuAtivo(). Os arquivos são juntados num único <script>
 * pelo build, por isso as funções de um enxergam as do outro.
 * =====================================================================
 */

/* ---------------------------------------------------------------------
   ESTADO DO LIVRO
   --------------------------------------------------------------------- */
const bookEl = document.getElementById("book");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const indicator = document.getElementById("pageIndicator");

const paginasHtml = montarPaginas();
const total = paginasHtml.length;
let atual = 0;          // índice da página visível (0 = capa)
let animando = false;   // trava contra cliques duplos durante a animação

/* Coloca as páginas no livro: a primeira fica por cima (z-index maior) */
paginasHtml.forEach((html, i) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html.trim();
    const pageEl = wrapper.firstChild;
    pageEl.style.zIndex = total - i;
    bookEl.appendChild(pageEl);
});

const pages = Array.from(bookEl.querySelectorAll(".page"));

/* ---------------------------------------------------------------------
   VIRAR PÁGINAS
   --------------------------------------------------------------------- */

/** Atualiza "3 / 11", habilita/desabilita as setas e marca o item no menu. */
function atualizarIndicador() {
    indicator.textContent = `${atual + 1} / ${total}`;
    prevBtn.disabled = atual === 0;
    nextBtn.disabled = atual === total - 1;
    destacarItemMenuAtivo();
}

/** Vira a página atual para trás (avança uma página), com animação. */
function virarProxima() {
    if (animando || atual >= total - 1) return;
    animando = true;
    const pagina = pages[atual];
    pagina.style.zIndex = total + 10; // fica por cima de tudo enquanto vira
    requestAnimationFrame(() => {
        pagina.style.transform = "rotateY(-178deg)";
    });
    atual++;
    atualizarIndicador();

    const finalizar = () => {
        pagina.style.zIndex = 1; // vai para baixo da pilha de páginas já viradas
        pagina.removeEventListener("transitionend", finalizar);
        animando = false;
    };
    pagina.addEventListener("transitionend", finalizar);
}

/** Desvira a página anterior (volta uma página), com animação. */
function virarAnterior() {
    if (animando || atual <= 0) return;
    animando = true;
    atual--;
    const pagina = pages[atual];
    pagina.style.zIndex = total + 10; // fica por cima enquanto volta
    requestAnimationFrame(() => {
        pagina.style.transform = "rotateY(0deg)";
    });
    atualizarIndicador();

    const finalizar = () => {
        pagina.style.zIndex = total - atual; // volta ao lugar normal na pilha
        pagina.removeEventListener("transitionend", finalizar);
        animando = false;
    };
    pagina.addEventListener("transitionend", finalizar);
}

/**
 * Pula direto para uma página, sem animar folha por folha
 * (usado pelo índice e pelo menu "Ir para").
 * @param {number} destino índice da página (0 = capa)
 */
function irParaPaginaInstant(destino) {
    destino = Math.max(0, Math.min(total - 1, destino));
    pages.forEach((p, i) => {
        p.style.transition = "none";
        if (i < destino) {
            p.style.transform = "rotateY(-178deg)";
            p.style.zIndex = 1;
        } else {
            p.style.transform = "rotateY(0deg)";
            p.style.zIndex = total - i;
        }
    });
    // força o navegador a aplicar as posições antes de devolver a animação
    void bookEl.offsetWidth;
    pages.forEach(p => { p.style.transition = ""; });

    atual = destino;
    atualizarIndicador();
    fecharMenu();
}

/* ---------------------------------------------------------------------
   EVENTOS: setas, índice e teclado
   --------------------------------------------------------------------- */
prevBtn.addEventListener("click", virarAnterior);
nextBtn.addEventListener("click", virarProxima);

bookEl.addEventListener("click", (e) => {
    const item = e.target.closest("[data-goto]"); // botões do índice
    if (item) irParaPaginaInstant(Number(item.dataset.goto));
});

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") virarProxima();
    if (e.key === "ArrowLeft") virarAnterior();
});

/* ---------------------------------------------------------------------
   ARRASTAR NO CELULAR (swipe)
   Só vira a página se o gesto for claramente horizontal, para não
   atrapalhar a rolagem vertical das listas de produtos.
   --------------------------------------------------------------------- */
let touchStartX = null;
let touchStartY = null;
let touchIsScroll = false; // true quando o gesto virou rolagem vertical

/** Zera o gesto em andamento. */
function limparGesto() {
    touchStartX = null;
    touchStartY = null;
    touchIsScroll = false;
}

bookEl.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchIsScroll = false;
}, { passive: true });

bookEl.addEventListener("touchmove", (e) => {
    if (touchStartX === null || touchIsScroll) return;
    const diffX = e.touches[0].clientX - touchStartX;
    const diffY = e.touches[0].clientY - touchStartY;
    // movimento mais vertical que horizontal = rolagem; desiste de virar
    if (Math.abs(diffY) > Math.abs(diffX)) touchIsScroll = true;
}, { passive: true });

bookEl.addEventListener("touchend", (e) => {
    if (touchStartX === null || touchIsScroll) { limparGesto(); return; }
    const diffX = e.changedTouches[0].clientX - touchStartX;
    const diffY = e.changedTouches[0].clientY - touchStartY;
    // exige pelo menos 40px na horizontal e 1,5x mais horizontal que vertical
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
        if (diffX < 0) virarProxima();
        else virarAnterior();
    }
    limparGesto();
}, { passive: true });
