/**
 * =====================================================================
 * APP.JS - LIGA OS BOTÕES DA TELA (último arquivo carregado)
 * =====================================================================
 */
(function (raiz) {
    'use strict';

    var Editor = raiz.Editor;
    var $ = function (id) { return document.getElementById(id); };

    // Elementos usados pelos outros arquivos
    Editor.dom = {
        fileInput: $('file-input'),
        loadBtn: $('load-btn'),
        saveBtn: $('save-btn'),
        emptyState: $('empty-state'),
        editorRoot: $('editor-root'),
        catList: $('categories-list'),
        parseWarning: $('parse-warning')
    };

    var dom = Editor.dom;
    dom.loadBtn.addEventListener('click', function () { dom.fileInput.click(); });
    dom.fileInput.addEventListener('change', Editor.carregar.handleFileSelect);
    dom.saveBtn.addEventListener('click', Editor.exportar.exportCatalog);
    $('add-category-btn').addEventListener('click', Editor.categoriasUI.addCategory);

    // Avisa antes de fechar a aba se houver um catálogo aberto (as edições ficam só na memória)
    raiz.addEventListener('beforeunload', function (e) {
        if (Editor.estado.categorias) { e.preventDefault(); e.returnValue = ''; }
    });
})(window);
