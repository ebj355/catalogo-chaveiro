/**
 * =====================================================================
 * FOTOS.JS - QUAL FOTO MOSTRAR NA PRÉ-VISUALIZAÇÃO DO EDITOR
 * =====================================================================
 *
 * Reproduz a mesma escolha de foto que o catálogo faz (src/js/fotos.js),
 * para o que aparece no editor ser o que vai aparecer no catálogo:
 *   - foto removida (IMAGENS_OCULTAS / semFoto)  -> sem foto
 *   - foto trocada no editor (IMAGENS_CUSTOM)    -> vence a original
 *   - foto original do mapa da categoria
 * =====================================================================
 */
(function (raiz) {
    'use strict';

    var Editor = raiz.Editor;
    var E = Editor.estado;

    /**
     * Foto de um produto pela chave (campo "foto", ou "tipo" na cópia de chaves).
     * @param {string} fotoKey chave da foto
     * @param {object} cat     categoria do produto
     * @returns {string|null}  data URL ou null
     */
    function findPhotoSrc(fotoKey, cat) {
        if (!fotoKey || E.imagensOcultas[fotoKey]) return null;

        // Só procura nos mapas DA PRÓPRIA categoria (ver MAPAS_POR_CATEGORIA)
        var mapNames = cat && Editor.MAPAS_POR_CATEGORIA[cat.id] ? Editor.MAPAS_POR_CATEGORIA[cat.id] : [];
        for (var i = 0; i < mapNames.length; i++) {
            var map = E.allImageMaps[mapNames[i]];
            if (map && map[fotoKey]) {
                // A foto trocada no editor substitui a original desta categoria
                if (E.imagensCustom[fotoKey]) return E.imagensCustom[fotoKey];
                return map[fotoKey];
            }
        }

        // Não há foto original nesta categoria. Uma IMAGENS_CUSTOM com a mesma
        // chave só vale se NÃO for cópia de uma foto de outra categoria. Isso
        // corrige um caso antigo: cadeado com foto "yale" recebendo, por engano,
        // a foto da chave Yale salva em IMAGENS_CUSTOM["yale"].
        if (E.imagensCustom[fotoKey]) {
            var customSrc = E.imagensCustom[fotoKey];
            for (var mapName in E.allImageMaps) {
                if (mapNames.indexOf(mapName) !== -1 || mapName === 'IMAGENS_CUSTOM' || mapName === 'IMAGENS_OCULTAS') continue;
                var outro = E.allImageMaps[mapName];
                if (outro && outro[fotoKey] && outro[fotoKey] === customSrc) return null;
            }
            return customSrc;
        }
        return null;
    }

    /**
     * Foto compartilhada de um grupo (fechaduras, ou produtos em "Uma foto para o grupo").
     * A foto adicionada no editor vence a original de IMAGENS_FECHADURA.
     * @param {string} grupoNome
     * @returns {string|null}
     */
    function findGroupPhotoSrc(grupoNome) {
        if (!grupoNome || E.imagensOcultas['group:' + grupoNome]) return null;
        if (E.imagensCustom[grupoNome]) return E.imagensCustom[grupoNome];
        var map = E.allImageMaps.IMAGENS_FECHADURA;
        return map && map[grupoNome] ? map[grupoNome] : null;
    }

    /**
     * Foto que um produto comum mostra, considerando o modo de foto.
     * @param {object} cat
     * @param {object} prod
     * @returns {string|null}
     */
    function findProductPhotoSrc(cat, prod) {
        if (!prod || prod.semFoto) return null;
        if (prod.fotoModo === 'grupo' && prod.grupo) return findGroupPhotoSrc(prod.grupo);
        if (prod.foto) return findPhotoSrc(prod.foto, cat);
        // Cópia de chaves usa o "tipo" como chave do mapa IMAGENS_CHAVE
        if (cat && cat.id === 'copia-chaves' && prod.tipo) return findPhotoSrc(prod.tipo, cat);
        return null;
    }

    Editor.fotos = {
        findPhotoSrc: findPhotoSrc,
        findGroupPhotoSrc: findGroupPhotoSrc,
        findProductPhotoSrc: findProductPhotoSrc
    };
})(window);
