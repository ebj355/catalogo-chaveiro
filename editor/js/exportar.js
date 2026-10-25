/**
 * =====================================================================
 * EXPORTAR.JS - MONTA E BAIXA O CATÁLOGO ATUALIZADO
 * =====================================================================
 *
 * Parte do arquivo que foi carregado (estado.rawHtml) e troca só os
 * blocos de dados, deixando o resto (CSS, código, fotos originais) igual:
 *   const IMAGENS_CUSTOM  = {...}   fotos novas/trocadas
 *   const IMAGENS_OCULTAS = {...}   fotos removidas
 *   const TAMANHOS_CUSTOM = {...}   tamanho da foto dos grupos de fechadura
 *   const CATEGORIAS      = [...]   categorias e produtos
 *
 * Catálogos antigos (anteriores ao suporte a fotos do editor) recebem
 * antes, automaticamente, o código que faltava (ensureCustomInfra).
 * O catálogo gerado por "npm run build" já tem tudo, e nada é injetado.
 * =====================================================================
 */
(function (raiz) {
    'use strict';

    var Editor = raiz.Editor;
    var E = Editor.estado;
    var D = raiz.Declaracoes;

    /**
     * Acrescenta a um catálogo ANTIGO o que ele precisa para mostrar as fotos
     * do editor. Em um catálogo que já tem esse suporte, não muda nada.
     * @param {string} texto html do catálogo
     * @returns {string}
     */
    function ensureCustomInfra(texto) {
        var out = texto;

        // 1. Declarações vazias que o editor vai preencher
        ['IMAGENS_CUSTOM', 'IMAGENS_OCULTAS', 'TAMANHOS_CUSTOM'].forEach(function (nome) {
            if (out.indexOf('const ' + nome) === -1) {
                out = out.replace(/const\s+CATEGORIAS\s*=\s*\[/, 'const ' + nome + ' = {};\n\nconst CATEGORIAS = [');
            }
        });

        // 2. Impede a foto original de aparecer quando o usuário removeu a foto
        var guardas = [
            ['if (cat.id === "copia-chaves" && p.tipo)', 'if (!p.fotoRemovida && cat.id === "copia-chaves" && p.tipo)'],
            ['else if (cat.id === "chaveirinho" && p.foto && IMAGENS_CHAVEIRINHO[p.foto])', 'else if (!p.fotoRemovida && cat.id === "chaveirinho" && p.foto && IMAGENS_CHAVEIRINHO[p.foto])'],
            ['else if (cat.id === "controle-portao" && p.foto && IMAGENS_CONTROLE[p.foto])', 'else if (!p.fotoRemovida && cat.id === "controle-portao" && p.foto && IMAGENS_CONTROLE[p.foto])'],
            ['else if (cat.id === "bateria" && p.foto && IMAGENS_BATERIA[p.foto])', 'else if (!p.fotoRemovida && cat.id === "bateria" && p.foto && IMAGENS_BATERIA[p.foto])'],
            ['else if (cat.id === "cadeados" && p.foto && IMAGENS_CADEADO[p.foto])', 'else if (!p.fotoRemovida && cat.id === "cadeados" && p.foto && IMAGENS_CADEADO[p.foto])'],
            ['else if (cat.id === "miolos" && p.foto && (IMAGENS_MIOLO[p.foto] || IMAGENS_GAVETA[p.foto] || IMAGENS_MIOLO_GRANDE[p.foto] || IMAGENS_MIOLO_TETRA[p.foto]))', 'else if (!p.fotoRemovida && cat.id === "miolos" && p.foto && (IMAGENS_MIOLO[p.foto] || IMAGENS_GAVETA[p.foto] || IMAGENS_MIOLO_GRANDE[p.foto] || IMAGENS_MIOLO_TETRA[p.foto]))'],
            ['else if (cat.id === "aberturas" && p.foto && IMAGENS_ABERTURAS[p.foto])', 'else if (!p.fotoRemovida && cat.id === "aberturas" && p.foto && IMAGENS_ABERTURAS[p.foto])'],
            ['else if (cat.id === "chaves-codificadas" && p.foto && IMAGENS_CODIFICADAS[p.foto])', 'else if (!p.fotoRemovida && cat.id === "chaves-codificadas" && p.foto && IMAGENS_CODIFICADAS[p.foto])']
        ];
        guardas.forEach(function (par) {
            if (out.indexOf(par[0]) !== -1 && out.indexOf(par[1]) === -1) out = out.replace(par[0], par[1]);
        });

        // 3. Foto do editor com prioridade sobre a original (só se ainda não existir)
        var marcador = '/* EDITOR_CUSTOM_PHOTO_OVERRIDE_V3 */';
        if (out.indexOf(marcador) === -1) {
            var override = '\n        ' + marcador + '\n' +
                '        // Fotos individuais adicionadas pelo editor têm prioridade absoluta.\n' +
                "        if (!p.semFoto && p.fotoModo === 'grupo' && p.grupo &&\n" +
                "            !IMAGENS_OCULTAS['group:' + p.grupo] && IMAGENS_CUSTOM[p.grupo]) {\n" +
                '          imagemChave = `<img src="${IMAGENS_CUSTOM[p.grupo]}" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;" alt="${p.nome}" />`;\n' +
                '        } else if (!p.semFoto && p.foto && !IMAGENS_OCULTAS[p.foto] && IMAGENS_CUSTOM[p.foto]) {\n' +
                '          imagemChave = `<img src="${IMAGENS_CUSTOM[p.foto]}" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;" alt="${p.nome}" />`;\n' +
                '        }\n' +
                '        if (p.semFoto) imagemChave = null;\n';

            // Ponto certo: logo antes do HTML do produto ser devolvido, para
            // nenhum bloco de foto original sobrescrever a escolha do usuário
            var antesDoReturn = /(\n\s*)return\s+`\s*\n\s*<div class="product">/;
            if (antesDoReturn.test(out)) {
                out = out.replace(antesDoReturn, function (_, quebra) {
                    return quebra + override + quebra + 'return `\n          <div class="product">';
                });
            } else {
                // Alternativa para catálogos com outra formatação
                var inicio = /(let\s+imagemChave\s*=\s*null\s*;)/;
                if (inicio.test(out)) out = out.replace(inicio, function (m) { return m + override; });
            }
        }

        // 4. Foto do grupo de fechadura vinda do editor
        if (out.indexOf('IMAGENS_CUSTOM[g.nome]') === -1) {
            var fotoGrupo = /<div class="lock-group__photo" data-grupo="\$\{g\.nome\}">[\s\S]*?<\/div>/;
            if (fotoGrupo.test(out)) {
                out = out.replace(fotoGrupo, function () {
                    return '<div class="lock-group__photo" data-grupo="${g.nome}">${(IMAGENS_FECHADURA[g.nome] || IMAGENS_CUSTOM[g.nome]) ? `<img src="${IMAGENS_FECHADURA[g.nome] || IMAGENS_CUSTOM[g.nome]}" alt="${g.nome}">` : cat.icone}</div>';
                });
            }
        }
        return out;
    }

    /**
     * Gera o texto do catálogo atualizado (sem baixar). Separado de
     * exportCatalog para poder ser testado.
     * @returns {string}
     */
    function montarCatalogoAtualizado() {
        var out = ensureCustomInfra(E.rawHtml);

        // Marca de versão: o catálogo entende fotos individuais e de grupo
        if (out.indexOf('CATALOGO_EDITOR_FOTOS_V2') === -1) {
            out = out.replace('</head>', '<meta name="CATALOGO_EDITOR_FOTOS_V2" content="individual-e-grupo">\n</head>');
        }

        // Troca os blocos de dados (um de cada vez: as posições mudam a cada troca)
        out = D.substituir(out, 'IMAGENS_CUSTOM', E.imagensCustom);
        out = D.substituir(out, 'IMAGENS_OCULTAS', E.imagensOcultas);
        out = D.substituir(out, 'TAMANHOS_CUSTOM', E.tamanhosCustom);
        out = D.substituir(out, 'CATEGORIAS', E.categorias);
        return out;
    }

    /** Baixa o catálogo atualizado como catalogo-chaveiro-senador-AAAA-MM-DD.html. */
    function exportCatalog() {
        if (!E.categorias) return;
        var blob = new Blob([montarCatalogoAtualizado()], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'catalogo-chaveiro-senador-' + new Date().toISOString().slice(0, 10) + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    Editor.exportar = {
        ensureCustomInfra: ensureCustomInfra,
        montarCatalogoAtualizado: montarCatalogoAtualizado,
        exportCatalog: exportCatalog
    };
})(window);
