/**
 * =====================================================================
 * CARREGAR.JS - ABRE O ARQUIVO DO CATÁLOGO E LÊ OS DADOS
 * =====================================================================
 *
 * O catálogo é um .html com os dados dentro do <script>. Daqui saem:
 *   CATEGORIAS        -> estado.categorias (obrigatório)
 *   IMAGENS_XXX       -> estado.allImageMaps (pré-visualização das fotos)
 *   IMAGENS_CUSTOM    -> estado.imagensCustom
 *   IMAGENS_OCULTAS   -> estado.imagensOcultas
 *   TAMANHOS_CUSTOM   -> estado.tamanhosCustom
 * =====================================================================
 */
(function (raiz) {
    'use strict';

    var Editor = raiz.Editor;
    var E = Editor.estado;
    var D = raiz.Declaracoes;

    /**
     * Lê o texto de um catálogo e prepara o editor.
     * @param {string} texto conteúdo do arquivo .html
     * @throws {Error} se o arquivo não tiver "const CATEGORIAS = [...]"
     */
    function loadCatalog(texto) {
        var dom = Editor.dom;
        E.rawHtml = texto;
        dom.parseWarning.classList.remove('show');
        dom.parseWarning.textContent = '';

        var catDecl = D.extrair(texto, 'CATEGORIAS');
        if (!catDecl) {
            throw new Error("Não encontrei 'const CATEGORIAS = [...]' no arquivo. Confirme que é o arquivo certo do catálogo.");
        }
        E.categorias = D.avaliar(catDecl.conteudo);

        // Todos os mapas de fotos, só para mostrar as fotos no editor
        E.allImageMaps = {};
        D.nomesDosMapasDeImagens(texto).forEach(function (nome) {
            var mapa = D.ler(texto, nome); // mapas que não puderem ser lidos são ignorados
            if (mapa) E.allImageMaps[nome] = mapa;
        });
        E.imagensCustom = E.allImageMaps.IMAGENS_CUSTOM || {};
        E.imagensOcultas = D.ler(texto, 'IMAGENS_OCULTAS') || {};
        E.tamanhosCustom = D.ler(texto, 'TAMANHOS_CUSTOM') || {};

        // Catálogos antigos não têm o código que entende fotos do editor.
        // Não é erro: a exportação acrescenta esse código automaticamente.
        var temSuporteAFotos = texto.indexOf('IMAGENS_CUSTOM') !== -1 && texto.indexOf('IMAGENS_CUSTOM[p.foto]') !== -1;
        if (!temSuporteAFotos) {
            dom.parseWarning.textContent = 'Este arquivo é de uma versão mais antiga do catálogo (sem o suporte genérico a fotos). ' +
                'Não tem problema: ao baixar, esta ferramenta já inclui automaticamente o que falta para tudo funcionar.';
            dom.parseWarning.classList.add('show');
        }

        Editor.categoriasUI.renderCategories();
        dom.emptyState.hidden = true;
        dom.editorRoot.hidden = false;
        dom.saveBtn.disabled = false;
    }

    /**
     * Trata o arquivo escolhido no botão "Carregar catálogo".
     * @param {Event} e evento change do <input type=file>
     */
    function handleFileSelect(e) {
        var arquivo = e.target.files[0];
        if (!arquivo) return;
        var leitor = new FileReader();
        leitor.onload = function (evt) {
            try {
                loadCatalog(evt.target.result);
            } catch (err) {
                alert('Não consegui ler esse arquivo como catálogo válido.\n\nDetalhe técnico: ' + err.message);
                console.error(err);
            }
        };
        leitor.readAsText(arquivo, 'utf-8');
        e.target.value = ''; // permite escolher o mesmo arquivo de novo
    }

    Editor.carregar = { loadCatalog: loadCatalog, handleFileSelect: handleFileSelect };
})(window);
