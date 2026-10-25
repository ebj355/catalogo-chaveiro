/**
 * =====================================================================
 * UTIL.JS - FUNÇÕES PEQUENAS USADAS EM TODO O EDITOR
 * =====================================================================
 */
(function (raiz) {
    'use strict';

    var Editor = raiz.Editor;

    /** Escapa texto para colocar dentro de HTML (& < >). */
    function escapeHtml(texto) {
        return String(texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /** Escapa texto para colocar dentro de um atributo HTML entre aspas duplas. */
    function escapeAttr(texto) {
        return escapeHtml(texto).replace(/"/g, '&quot;');
    }

    /**
     * Gera um id a partir do nome ("Cópia de Chaves" -> "copia-de-chaves").
     * Usado como id interno de categorias novas.
     */
    function slugify(texto) {
        return (texto || '')
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || ('categoria-' + Date.now());
    }

    /** Chave única para uma foto nova (ex.: "custom_lx3k9a_4fj2c"). */
    function uniqueFotoKey() {
        return 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    }

    /**
     * Junta produtos SEGUIDOS com o mesmo "grupo", guardando a posição de
     * cada um na lista original (mesma regra do catálogo).
     * @returns {{nome:string, itens:{prod:object, prodIdx:number}[]}[]}
     */
    function agruparConsecutivos(produtos) {
        var grupos = [];
        var atual = null;
        produtos.forEach(function (prod, prodIdx) {
            if (!atual || atual.nome !== prod.grupo) {
                atual = { nome: prod.grupo, itens: [] };
                grupos.push(atual);
            }
            atual.itens.push({ prod: prod, prodIdx: prodIdx });
        });
        return grupos;
    }

    /**
     * Cria um campo (rótulo + input/textarea) ligado a uma propriedade do
     * produto: cada tecla digitada atualiza prod[campo]. Campo vazio é
     * apagado do produto (para não gravar "condicao": "" no catálogo).
     *
     * @param {object} prod        produto que será alterado
     * @param {string} rotulo      texto do rótulo
     * @param {string} campo       nome da propriedade (nome, preco, desc...)
     * @param {boolean} inteiro    ocupa a linha inteira da grade?
     * @param {boolean} multilinha usa <textarea> em vez de <input>?
     * @returns {HTMLDivElement}
     */
    function campoDoProduto(prod, rotulo, campo, inteiro, multilinha) {
        var bloco = document.createElement('div');
        if (inteiro) bloco.className = 'full';

        var label = document.createElement('label');
        label.textContent = rotulo;
        bloco.appendChild(label);

        var entrada = document.createElement(multilinha ? 'textarea' : 'input');
        if (!multilinha) entrada.type = 'text';
        entrada.value = prod[campo] || '';
        entrada.addEventListener('input', function (e) {
            var valor = e.target.value;
            if (valor === '') delete prod[campo];
            else prod[campo] = valor;
        });
        bloco.appendChild(entrada);
        return bloco;
    }

    /**
     * Lê uma foto escolhida pelo usuário e devolve como data URL
     * (o formato em que as fotos ficam dentro do catálogo).
     * @param {File} arquivo
     * @param {function(string)} pronto chamado com o data URL
     */
    function lerFoto(arquivo, pronto) {
        var leitor = new FileReader();
        leitor.onload = function (evt) { pronto(evt.target.result); };
        leitor.readAsDataURL(arquivo);
    }

    /** Cria um <input type=file> invisível que aceita só imagens. */
    function seletorDeFoto() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        return input;
    }

    /** Botão "×" que fica no canto da foto para removê-la. */
    function botaoRemoverFoto(titulo, aoClicar) {
        var rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'remove-photo';
        rm.textContent = '×';
        rm.title = titulo;
        rm.addEventListener('click', function (ev) {
            ev.stopPropagation(); // não abre o seletor de foto da caixa
            aoClicar();
        });
        return rm;
    }

    Editor.util = {
        escapeHtml: escapeHtml,
        escapeAttr: escapeAttr,
        slugify: slugify,
        uniqueFotoKey: uniqueFotoKey,
        agruparConsecutivos: agruparConsecutivos,
        campoDoProduto: campoDoProduto,
        lerFoto: lerFoto,
        seletorDeFoto: seletorDeFoto,
        botaoRemoverFoto: botaoRemoverFoto
    };
})(window);
