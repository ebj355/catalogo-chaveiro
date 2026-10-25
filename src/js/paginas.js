/**
 * =====================================================================
 * PAGINAS.JS - MONTA O HTML DE TODAS AS PÁGINAS DO LIVRO
 * =====================================================================
 *
 * Ordem das páginas:
 *   0     capa (logo, nome da loja e subtítulo de CONFIG)
 *   1     índice (um botão por categoria, que pula direto para ela)
 *   2..N  uma página por categoria de CATEGORIAS
 *
 * Dois jeitos de mostrar produtos:
 *   - categoria "fechaduras": agrupada por modelo, com UMA foto por grupo
 *     e os itens em lista compacta (nome, condição e preço);
 *   - demais categorias: um cartão por produto (foto, nome, descrição,
 *     preço e condição). Produtos seguidos com o mesmo "grupo" ficam num
 *     bloco com o nome do grupo como título.
 *
 * Usa: CONFIG, LOGO_CHAVEIRO, CATEGORIAS, TAMANHOS_CUSTOM (dados do build)
 *      e as funções de src/js/fotos.js.
 * =====================================================================
 */

/**
 * Junta produtos SEGUIDOS que têm o mesmo valor de "grupo".
 * (Mesma regra do editor, para a tela de edição bater com o resultado.)
 * @param {object[]} produtos
 * @returns {{nome:string, itens:object[]}[]}
 */
function agruparConsecutivos(produtos) {
    const grupos = [];
    let atual = null;
    produtos.forEach(p => {
        if (!atual || atual.nome !== p.grupo) {
            atual = { nome: p.grupo, itens: [] };
            grupos.push(atual);
        }
        atual.itens.push(p);
    });
    return grupos;
}

/** Página 0: capa. */
function paginaCapa() {
    return `
    <div class="page cover">
      <div class="cover__emblem"><img src="${LOGO_CHAVEIRO}" alt="Logo ${esc(CONFIG.nomeLoja)}" /></div>
      <h1 class="cover__title">${esc(CONFIG.nomeLoja)}</h1>
      <p class="cover__subtitle">${esc(CONFIG.subtitulo)}</p>
      <span class="cover__hint">Arraste para o lado</span>
    </div>
  `;
}

/** Página 1: índice. Cada botão leva à página da categoria (data-goto). */
function paginaIndice() {
    return `
    <div class="page">
      <span class="tag"><span class="page__icon">📖</span> Índice</span>
      <h2 class="page__title">O que você encontra aqui</h2>
      <p class="page__desc">Toque em uma categoria para ir direto até ela.</p>
      <div class="index-list">
        ${CATEGORIAS.map((cat, i) => `
          <button class="index-item" data-goto="${i + 2}">
            <span class="index-item__icon">${esc(cat.icone)}</span>
            <span class="index-item__label">${esc(cat.nome)}</span>
            <span class="index-item__page">pág. ${i + 3}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

/**
 * Um item dentro de um grupo de fechadura: nome, condição e preço.
 * Se o item tiver foto própria (definida no editor), ela aparece à esquerda.
 */
function itemDeFechadura(p) {
    const topo = `
                  <div class="lock-item__top">
                    <span class="lock-item__name">${esc(p.nome)}</span>
                    ${p.condicao ? `<span class="lock-item__cond">${esc(p.condicao)}</span>` : ""}
                  </div>
                  <span class="lock-item__price">${esc(p.preco)}</span>`;
    const foto = fotoDoItemDeGrupo(p);
    if (!foto) {
        return `
                <div class="lock-item">${topo}
                </div>
              `;
    }
    return `
                <div class="lock-item lock-item--com-foto">
                  <span class="lock-item__foto"><img src="${foto}" alt="${esc(p.nome)}"></span>
                  <div class="lock-item__texto">${topo}
                  </div>
                </div>
              `;
}

/**
 * Conteúdo da categoria "fechaduras": um bloco por grupo (modelo).
 * A largura da foto do grupo pode vir do editor (TAMANHOS_CUSTOM, em px).
 */
function conteudoFechaduras(cat) {
    return agruparConsecutivos(cat.produtos).map(g => {
        const tamanhoPx = TAMANHOS_CUSTOM[g.nome];
        const estiloTamanho = tamanhoPx ? ` style="width:${tamanhoPx}px"` : "";
        const foto = fotoDoGrupo(g);
        return `
        <div class="lock-group">
          <p class="lock-group__title">${esc(g.nome)}</p>
          <div class="lock-group__content">
            <div class="lock-group__photo" data-grupo="${esc(g.nome)}"${estiloTamanho}>${foto ? `<img src="${foto}" alt="${esc(g.nome)}">` : esc(cat.icone)}</div>
            <div class="lock-group__items">
              ${g.itens.map(itemDeFechadura).join("")}
            </div>
          </div>
        </div>
      `;
    }).join("");
}

/** Cartão de um produto comum: foto (ou ícone), nome, descrição, preço e condição. */
function cartaoDeProduto(cat, p) {
    // data-foto / data-cat servem para os ajustes de tamanho em ajustes-fotos.css
    const dataFoto = p.foto ? ` data-foto="${esc(p.foto)}"` : (cat.id === "copia-chaves" ? ` data-foto="chave"` : "");
    return `
          <div class="product">
            <div class="product__icon" data-cat="${esc(cat.id)}"${dataFoto}>
              ${fotoDoProduto(cat, p) || esc(cat.icone)}
            </div>
            <div class="product__body">
              <p class="product__name">${esc(p.nome)}</p>
              ${p.desc ? `<p class="product__desc">${esc(p.desc)}</p>` : ""}
              <div class="product__meta">
                <p class="product__price">${esc(p.preco)}</p>
                ${p.condicao ? `<span class="product__tag">${esc(p.condicao)}</span>` : ""}
              </div>
            </div>
          </div>
        `;
}

/**
 * Conteúdo das demais categorias. Produtos seguidos com o mesmo "grupo"
 * viram um bloco com título, para que na impressão o título nunca fique
 * separado dos produtos dele.
 */
function conteudoProdutos(cat) {
    const blocos = [];
    let blocoAtual = null;
    cat.produtos.forEach(p => {
        if (p.grupo) {
            if (!blocoAtual || blocoAtual.grupo !== p.grupo) {
                blocoAtual = { grupo: p.grupo, produtos: [] };
                blocos.push(blocoAtual);
            }
            blocoAtual.produtos.push(p);
        } else {
            blocoAtual = null;
            blocos.push({ grupo: null, produtos: [p] });
        }
    });

    return blocos.map(bloco => {
        if (!bloco.grupo) return cartaoDeProduto(cat, bloco.produtos[0]);
        return `
          <div class="product-group-block">
            <div class="product-group">${esc(bloco.grupo)}</div>
            ${bloco.produtos.map(p => cartaoDeProduto(cat, p)).join("")}
          </div>
        `;
    }).join("");
}

/** Página de uma categoria. */
function paginaCategoria(cat) {
    const produtos = cat.produtos || [];
    const conteudo = cat.id === "fechaduras"
        ? conteudoFechaduras(Object.assign({}, cat, { produtos }))
        : conteudoProdutos(Object.assign({}, cat, { produtos }));
    return `
      <div class="page">
        <span class="tag"><span class="page__icon">${esc(cat.icone)}</span> ${esc(cat.nome)}</span>
        <p class="page__desc">${esc(cat.descricao)}</p>
        <div class="products">
          ${conteudo}
        </div>
      </div>
    `;
}

/**
 * Gera o HTML de todas as páginas, na ordem do livro.
 * @returns {string[]} uma string de HTML por página
 */
function montarPaginas() {
    return [paginaCapa(), paginaIndice()].concat(CATEGORIAS.map(paginaCategoria));
}
