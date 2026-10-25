/**
 * =====================================================================
 * DECLARACOES.JS - LER E SUBSTITUIR DECLARAÇÕES "const NOME = ..." NO HTML
 * =====================================================================
 *
 * O catálogo é um único arquivo .html que guarda os dados dentro do
 * <script>, assim:
 *
 *     const CATEGORIAS = [ ...produtos... ];
 *     const IMAGENS_CHAVE = { "yale": "data:image/png;base64,..." };
 *
 * Este arquivo sabe ENCONTRAR esses blocos (contando colchetes/chaves e
 * ignorando o que está dentro de textos) e TROCAR o conteúdo deles sem
 * mexer no resto do arquivo.
 *
 * É usado em dois lugares, por isso funciona nos dois ambientes:
 *   - no navegador, pelo editor (fica em window.Declaracoes)
 *   - no Node.js, pelas ferramentas de build/importação (require)
 * =====================================================================
 */
(function (raiz, fabrica) {
    'use strict';
    var api = fabrica();
    if (typeof module !== 'undefined' && module.exports) module.exports = api; // Node.js
    else raiz.Declaracoes = api;                                                 // navegador
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /**
     * Localiza o bloco "const NOME = [ ... ];" ou "const NOME = { ... };".
     *
     * Percorre o texto caractere a caractere contando a profundidade de
     * colchetes/chaves. Tudo o que estiver dentro de aspas simples, duplas
     * ou crase é ignorado, então um "}" dentro de um texto não confunde a
     * contagem (as fotos em base64 e as descrições têm todo tipo de caractere).
     *
     * @param {string} texto conteúdo completo do arquivo .html
     * @param {string} nome  nome da constante (ex.: "CATEGORIAS")
     * @returns {null|{inicioDeclaracao:number, inicioConteudo:number, fimConteudo:number, fim:number, conteudo:string}}
     *          null se não encontrar; senão as posições:
     *          - inicioDeclaracao: onde começa "const NOME = "
     *          - inicioConteudo / fimConteudo: o literal [..] ou {..} (fim exclusivo)
     *          - fim: logo depois do ";" final
     *          - conteudo: o texto do literal
     */
    function extrair(texto, nome) {
        var marcador = 'const ' + nome + ' = ';
        var pos = texto.indexOf(marcador);
        if (pos === -1) return null;

        var inicio = pos + marcador.length;
        var abre = texto[inicio];
        if (abre !== '[' && abre !== '{') return null; // só lida com arrays e objetos
        var fecha = abre === '[' ? ']' : '}';

        var profundidade = 0;
        var emTexto = false;   // estamos dentro de "...", '...' ou `...`?
        var aspas = '';        // qual aspa abriu o texto atual
        var escapado = false;  // o caractere anterior foi uma barra invertida?
        var i = inicio;

        for (; i < texto.length; i++) {
            var c = texto[i];
            if (emTexto) {
                if (escapado) escapado = false;
                else if (c === '\\') escapado = true;
                else if (c === aspas) emTexto = false;
                continue;
            }
            if (c === '"' || c === "'" || c === '`') { emTexto = true; aspas = c; continue; }
            if (c === abre) profundidade++;
            else if (c === fecha) {
                profundidade--;
                if (profundidade === 0) { i++; break; }
            }
        }

        // avança até o ";" que encerra a declaração
        var fim = i;
        while (fim < texto.length && texto[fim] !== ';') fim++;
        fim++;

        return {
            inicioDeclaracao: pos,
            inicioConteudo: inicio,
            fimConteudo: i,
            fim: fim,
            conteudo: texto.slice(inicio, i)
        };
    }

    /**
     * Transforma o texto de um literal JavaScript em valor.
     * Usa Function (e não JSON.parse) porque o catálogo original foi escrito
     * à mão em JS: tem chaves sem aspas e vírgulas no final dos itens.
     * Só é chamado com o conteúdo do próprio arquivo do catálogo que o
     * usuário escolheu abrir.
     *
     * @param {string} literal ex.: '{ yale: "data:..." }'
     * @returns {*} o objeto/array correspondente
     */
    function avaliar(literal) {
        // eslint-disable-next-line no-new-func
        return (new Function('return (' + literal + ');'))();
    }

    /**
     * Lê uma declaração e já devolve o valor, ou null se não existir
     * ou não puder ser avaliada.
     * @param {string} texto
     * @param {string} nome
     * @returns {*|null}
     */
    function ler(texto, nome) {
        var d = extrair(texto, nome);
        if (!d) return null;
        try { return avaliar(d.conteudo); } catch (e) { return null; }
    }

    /**
     * Substitui o conteúdo de "const NOME = ..." por um novo valor (em JSON).
     * Se a declaração não existir, devolve o texto sem alteração.
     * @param {string} texto
     * @param {string} nome
     * @param {*} valor qualquer valor serializável em JSON
     * @returns {string} o texto atualizado
     */
    function substituir(texto, nome, valor) {
        var d = extrair(texto, nome);
        if (!d) return texto;
        return texto.slice(0, d.inicioConteudo) + JSON.stringify(valor, null, 2) + texto.slice(d.fimConteudo);
    }

    /**
     * Lista os nomes de todos os mapas de fotos "const IMAGENS_XXX = {...}"
     * que existem no arquivo, na ordem em que aparecem.
     * @param {string} texto
     * @returns {string[]} ex.: ["IMAGENS_CHAVEIRINHO", "IMAGENS_CHAVE", ...]
     */
    function nomesDosMapasDeImagens(texto) {
        var nomes = [];
        var re = /const (IMAGENS_[A-Z_]+)\s*=\s*/g;
        var m;
        while ((m = re.exec(texto)) !== null) {
            if (nomes.indexOf(m[1]) === -1) nomes.push(m[1]);
        }
        return nomes;
    }

    return {
        extrair: extrair,
        avaliar: avaliar,
        ler: ler,
        substituir: substituir,
        nomesDosMapasDeImagens: nomesDosMapasDeImagens
    };
});
