/**
 * =====================================================================
 * FOTOS.JS - QUAL FOTO APARECE EM CADA PRODUTO
 * =====================================================================
 *
 * Os mapas de fotos (IMAGENS_CHAVE, IMAGENS_FECHADURA, IMAGENS_CUSTOM...)
 * e IMAGENS_OCULTAS são declarados pelo build logo antes deste arquivo,
 * a partir de src/imagens/ e src/dados/fotos-ocultas.json.
 *
 * Ordem de decisão para um produto (a mesma que o editor mostra):
 *   1. "semFoto: true"            -> sem foto (aparece o ícone da categoria)
 *   2. foto do GRUPO trocada no editor (fotoModo "grupo" + IMAGENS_CUSTOM[grupo])
 *   3. foto INDIVIDUAL trocada/adicionada no editor (IMAGENS_CUSTOM[foto])
 *   4. foto original da categoria (tabela FOTOS_NATIVAS abaixo)
 *   5. nada encontrado            -> ícone da categoria
 * Fotos marcadas em IMAGENS_OCULTAS (removidas no editor) são ignoradas.
 *
 * Compatibilidade com o editor: o editor procura no catálogo os trechos
 * "IMAGENS_CUSTOM[p.foto]", "IMAGENS_CUSTOM[g.nome]" e o marcador
 * EDITOR_CUSTOM_PHOTO_OVERRIDE_V3. Como eles já existem aqui, o editor
 * sabe que este catálogo entende fotos individuais e de grupo e NÃO
 * injeta código extra ao exportar. Não remova esses trechos.
 * =====================================================================
 */

/* Estilos inline das fotos (mantidos idênticos aos do catálogo original) */
const ESTILO_COBRIR = "width:100%;height:100%;object-fit:cover;object-position:center;display:block;";
const ESTILO_CONTER = "width:100%;height:100%;object-fit:contain;object-position:center;display:block;";
const ESTILO_CHAVEIRINHO = "width:100%;height:100%;object-fit:cover;display:block;";

/**
 * Onde procurar a foto original de cada categoria (campo "foto" do produto).
 * A ordem dos mapas importa: o primeiro que tiver a foto vence.
 * Cada categoria só olha os SEUS mapas: a chave "yale", por exemplo,
 * existe em IMAGENS_CHAVE e em IMAGENS_CADEADO com fotos diferentes.
 */
const FOTOS_NATIVAS = {
    "chaveirinho":        { mapas: [IMAGENS_CHAVEIRINHO], estilo: ESTILO_CHAVEIRINHO },
    "controle-portao":    { mapas: [IMAGENS_CONTROLE],    estilo: ESTILO_CONTER },
    "bateria":            { mapas: [IMAGENS_BATERIA],     estilo: ESTILO_COBRIR },
    "cadeados":           { mapas: [IMAGENS_CADEADO],     estilo: ESTILO_COBRIR },
    "miolos":             { mapas: [IMAGENS_MIOLO, IMAGENS_GAVETA, IMAGENS_MIOLO_GRANDE, IMAGENS_MIOLO_TETRA], estilo: ESTILO_COBRIR },
    "aberturas":          { mapas: [IMAGENS_ABERTURAS],   estilo: ESTILO_COBRIR },
    "chaves-codificadas": { mapas: [IMAGENS_CODIFICADAS], estilo: ESTILO_COBRIR }
};

/**
 * Escapa texto para colocar dentro do HTML (evita que um "<" digitado
 * no editor quebre a página).
 * @param {*} texto
 * @returns {string}
 */
function esc(texto) {
    return String(texto == null ? "" : texto)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Monta a tag <img> no formato usado pelo catálogo. */
function tagImagem(src, estilo, alt) {
    return `<img src="${src}" style="${estilo}" alt="${esc(alt)}" />`;
}

/**
 * Foto da cópia de chave pelo "tipo" (yale, tetra, gorge...).
 * Tipo desconhecido usa a foto da chave Yale.
 * @param {string} tipo
 * @returns {string} tag <img>
 */
function gerarImagemChave(tipo) {
    const src = IMAGENS_CHAVE[tipo] || IMAGENS_CHAVE.yale;
    return `<img src="${src}" alt="${esc(tipo)}" style="${ESTILO_COBRIR}">`;
}

/**
 * Foto original (não editada) do produto, conforme a categoria.
 * @param {object} cat categoria
 * @param {object} p   produto
 * @returns {string|null} tag <img> ou null
 */
function fotoNativa(cat, p) {
    // (Ordem "p.tipo && cat.id" de propósito: o texto "cat.id === ... && p.tipo"
    //  é procurado pelo editor para corrigir catálogos ANTIGOS e não deve existir aqui.)
    if (p.tipo && cat.id === "copia-chaves") return gerarImagemChave(p.tipo);
    const fonte = FOTOS_NATIVAS[cat.id];
    if (!fonte || !p.foto) return null;
    for (const mapa of fonte.mapas) {
        if (mapa[p.foto]) return tagImagem(mapa[p.foto], fonte.estilo, p.nome);
    }
    return null;
}

/**
 * Foto final de um produto (já aplicando as escolhas feitas no editor).
 * @param {object} cat categoria
 * @param {object} p   produto
 * @returns {string|null} tag <img>, ou null para mostrar o ícone da categoria
 */
function fotoDoProduto(cat, p) {
    if (p.semFoto) return null;

    /* EDITOR_CUSTOM_PHOTO_OVERRIDE_V3 */
    // Fotos adicionadas pelo editor têm prioridade sobre a foto original.
    if (p.fotoModo === "grupo" && p.grupo && !IMAGENS_OCULTAS["group:" + p.grupo] && IMAGENS_CUSTOM[p.grupo]) {
        return tagImagem(IMAGENS_CUSTOM[p.grupo], ESTILO_COBRIR, p.nome);
    }
    if (p.foto && !IMAGENS_OCULTAS[p.foto] && IMAGENS_CUSTOM[p.foto]) {
        return tagImagem(IMAGENS_CUSTOM[p.foto], ESTILO_COBRIR, p.nome);
    }

    return fotoNativa(cat, p);
}

/**
 * Foto compartilhada de um grupo de fechadura (uma por modelo).
 * A foto trocada no editor vence a original; se o usuário removeu a foto
 * do grupo no editor ("group:<nome>" em IMAGENS_OCULTAS), não mostra nada.
 * @param {{nome:string}} g grupo
 * @returns {string|null} endereço da imagem (data URL) ou null
 */
function fotoDoGrupo(g) {
    if (!g.nome || IMAGENS_OCULTAS["group:" + g.nome]) return null;
    return IMAGENS_CUSTOM[g.nome] || IMAGENS_FECHADURA[g.nome] || null;
}

/**
 * Foto própria de um item dentro de um grupo de fechadura (opcional).
 * Só existe quando, no editor, o item foi marcado como "Foto individual".
 * @param {object} p item
 * @returns {string|null} endereço da imagem ou null
 */
function fotoDoItemDeGrupo(p) {
    if (p.semFoto || p.fotoModo !== "individual" || !p.foto || IMAGENS_OCULTAS[p.foto]) return null;
    return IMAGENS_CUSTOM[p.foto] || null;
}
