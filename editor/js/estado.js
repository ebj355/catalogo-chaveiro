/**
 * =====================================================================
 * ESTADO.JS - O QUE O EDITOR GUARDA NA MEMÓRIA ENQUANTO VOCÊ EDITA
 * =====================================================================
 *
 * Tudo fica em window.Editor (um "espaço de nomes" compartilhado pelos
 * outros arquivos do editor). Nada é salvo no navegador: ao fechar a
 * aba sem baixar o catálogo, as mudanças são perdidas.
 * =====================================================================
 */
(function (raiz) {
    'use strict';

    var Editor = raiz.Editor = raiz.Editor || {};

    /**
     * Dados do catálogo carregado. São MODIFICADOS diretamente pelos campos
     * da tela e regravados no arquivo na hora de exportar.
     */
    Editor.estado = {
        rawHtml: '',          // texto completo do arquivo carregado (base da exportação)
        categorias: null,     // CATEGORIAS: array de categorias, cada uma com seus produtos
        imagensCustom: {},    // IMAGENS_CUSTOM: fotos novas/trocadas { chave: dataURL }
        imagensOcultas: {},   // IMAGENS_OCULTAS: fotos removidas { chave: true } ou { "group:<nome>": true }
        tamanhosCustom: {},   // TAMANHOS_CUSTOM: largura (px) da foto de cada grupo de fechadura
        allImageMaps: {}      // todos os IMAGENS_XXX do arquivo, só para pré-visualizar as fotos
    };

    /** Opções de tamanho da foto de um grupo de fechadura no catálogo (largura em px). */
    Editor.TAMANHOS_GRUPO = [
        { valor: '', label: 'Padrão' },
        { valor: '110', label: 'Pequena' },
        { valor: '150', label: 'Média' },
        { valor: '190', label: 'Grande' }
    ];

    /**
     * Em quais mapas de fotos cada categoria procura a foto original.
     * Deve bater com FOTOS_NATIVAS em src/js/fotos.js do catálogo.
     * Nunca procuramos em "qualquer" mapa: a chave "yale" existe em
     * IMAGENS_CHAVE e em IMAGENS_CADEADO, com fotos diferentes.
     */
    Editor.MAPAS_POR_CATEGORIA = {
        'copia-chaves': ['IMAGENS_CHAVE'],
        'chaveirinho': ['IMAGENS_CHAVEIRINHO'],
        'controle-portao': ['IMAGENS_CONTROLE'],
        'bateria': ['IMAGENS_BATERIA'],
        'cadeados': ['IMAGENS_CADEADO'],
        'miolos': ['IMAGENS_MIOLO', 'IMAGENS_GAVETA', 'IMAGENS_MIOLO_GRANDE', 'IMAGENS_MIOLO_TETRA'],
        'aberturas': ['IMAGENS_ABERTURAS'],
        'chaves-codificadas': ['IMAGENS_CODIFICADAS']
    };

    /** Elementos da página usados por vários arquivos (preenchido em app.js). */
    Editor.dom = {};
})(window);
