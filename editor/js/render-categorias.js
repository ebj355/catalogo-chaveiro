/**
 * =====================================================================
 * RENDER-CATEGORIAS.JS - LISTA DE CATEGORIAS DO EDITOR
 * =====================================================================
 *
 * Cada categoria é um cartão que abre/fecha ao clicar no cabeçalho:
 *   cabeçalho: ícone, nome, quantidade de produtos, setas ▲▼ (mudar a
 *              ordem no catálogo) e a seta de abrir;
 *   corpo:     campos da categoria (ícone, nome, descrição, id), os
 *              produtos (ou grupos, em "fechaduras") e "Excluir categoria".
 *
 * A ordem das categorias aqui é a ordem das páginas no catálogo.
 * =====================================================================
 */
(function (raiz) {
    'use strict';

    var Editor = raiz.Editor;
    var E = Editor.estado;
    var U = Editor.util;

    /** Redesenha a lista inteira de categorias. */
    function renderCategories() {
        var lista = Editor.dom.catList;
        lista.innerHTML = '';
        E.categorias.forEach(function (cat, catIdx) {
            lista.appendChild(renderCategoryCard(cat, catIdx));
        });
    }

    /**
     * Redesenha tudo mantendo aberta a categoria que estava aberta.
     * Usado depois de incluir/excluir produtos.
     */
    function rerenderCategory(catIdx) {
        var lista = Editor.dom.catList;
        var estavaAberta = lista.children[catIdx] && lista.children[catIdx].classList.contains('open');
        renderCategories();
        if (estavaAberta && lista.children[catIdx]) lista.children[catIdx].classList.add('open');
    }

    /** Troca a categoria de lugar com a vizinha (delta -1 = sobe, +1 = desce). */
    function moveCategory(catIdx, delta) {
        var destino = catIdx + delta;
        if (destino < 0 || destino >= E.categorias.length) return;
        var lista = Editor.dom.catList;
        var estavaAberta = lista.children[catIdx] && lista.children[catIdx].classList.contains('open');
        var tmp = E.categorias[catIdx];
        E.categorias[catIdx] = E.categorias[destino];
        E.categorias[destino] = tmp;
        renderCategories();
        if (estavaAberta && lista.children[destino]) lista.children[destino].classList.add('open');
    }

    /**
     * Desenha o cartão de uma categoria.
     * @param {object} cat
     * @param {number} catIdx
     * @returns {HTMLDivElement}
     */
    function renderCategoryCard(cat, catIdx) {
        var card = document.createElement('div');
        card.className = 'cat-card';
        var fechaduras = cat.id === 'fechaduras';
        if (!cat.produtos) cat.produtos = [];

        /* ---------- Cabeçalho ---------- */
        var head = document.createElement('div');
        head.className = 'cat-head';
        head.innerHTML =
            '<div class="cat-icon-badge">' + U.escapeHtml(cat.icone || '📦') + '</div>' +
            '<div class="cat-head-info">' +
            '  <div class="name">' + U.escapeHtml(cat.nome || '(sem nome)') + '</div>' +
            '  <div class="meta">' + cat.produtos.length + ' produto(s) · id: ' + U.escapeHtml(cat.id || '') + '</div>' +
            '</div>' +
            '<div class="cat-move">' +
            '  <button class="cat-move-btn" data-move="up" title="Mover categoria para cima"' + (catIdx === 0 ? ' disabled' : '') + '>▲</button>' +
            '  <button class="cat-move-btn" data-move="down" title="Mover categoria para baixo"' + (catIdx === E.categorias.length - 1 ? ' disabled' : '') + '>▼</button>' +
            '</div>' +
            '<div class="chev">▶</div>';
        head.querySelector('[data-move="up"]').addEventListener('click', function (e) { e.stopPropagation(); moveCategory(catIdx, -1); });
        head.querySelector('[data-move="down"]').addEventListener('click', function (e) { e.stopPropagation(); moveCategory(catIdx, 1); });
        head.addEventListener('click', function () { card.classList.toggle('open'); });
        card.appendChild(head);

        /** Atualiza o cabeçalho enquanto o usuário digita nos campos. */
        function syncHead() {
            head.querySelector('.cat-icon-badge').textContent = cat.icone || '📦';
            head.querySelector('.name').textContent = cat.nome || '(sem nome)';
            head.querySelector('.meta').textContent = cat.produtos.length + ' produto(s) · id: ' + (cat.id || '');
        }

        var body = document.createElement('div');
        body.className = 'cat-body';

        /* ---------- Campos da categoria ---------- */
        var fg = document.createElement('div');
        fg.className = 'field-grid';
        fg.innerHTML =
            '<label>Ícone</label><input type="text" data-field="icone" value="' + U.escapeAttr(cat.icone || '') + '" maxlength="4">' +
            '<label>Nome</label><input type="text" data-field="nome" value="' + U.escapeAttr(cat.nome || '') + '">' +
            '<label>Descrição</label><textarea data-field="descricao" rows="2">' + U.escapeHtml(cat.descricao || '') + '</textarea>' +
            '<label>ID interno</label><input type="text" data-field="id" value="' + U.escapeAttr(cat.id || '') + '">';
        ['icone', 'nome', 'descricao', 'id'].forEach(function (campo) {
            fg.querySelector('[data-field="' + campo + '"]').addEventListener('input', function (e) {
                cat[campo] = e.target.value;
                if (campo !== 'descricao') syncHead();
            });
        });
        body.appendChild(fg);

        var idHint = document.createElement('div');
        idHint.className = 'id-hint';
        idHint.textContent = 'O ID é usado internamente para organizar fotos e não precisa ser mexido, a menos que você saiba o que está fazendo.';
        body.appendChild(idHint);

        if (fechaduras) {
            body.appendChild(nota('Você pode usar uma foto única para todo o grupo ou escolher foto individual em cada produto. Assim, fechaduras podem compartilhar uma imagem ou ter uma imagem própria por item.'));
        }

        /* ---------- Produtos ---------- */
        var pTitle = document.createElement('div');
        pTitle.className = 'products-title';
        pTitle.innerHTML = '<h3>' + (fechaduras ? 'Grupos de fechadura' : 'Produtos') + '</h3>';
        body.appendChild(pTitle);

        if (fechaduras) {
            U.agruparConsecutivos(cat.produtos).forEach(function (grupo) {
                body.appendChild(Editor.fechadurasUI.renderLockGroupCard(cat, grupo, catIdx));
            });
            body.appendChild(botaoAdicionar('+ Adicionar novo grupo', '', function () {
                cat.produtos.push({ nome: 'Novo item', preco: 'R$ 0,00', grupo: 'Novo grupo' });
                rerenderCategory(catIdx);
            }));
        } else {
            body.appendChild(nota('Foto: use “Individual” para uma imagem exclusiva do produto ou “Uma foto para o grupo” para compartilhar a mesma imagem entre vários produtos.'));
            cat.produtos.forEach(function (prod, prodIdx) {
                body.appendChild(Editor.produtosUI.renderProductCard(cat, prod, prodIdx));
            });

            // Produto sem foto própria: entra no último grupo usado e usa a foto do grupo
            body.appendChild(botaoAdicionar('+ Adicionar produto sem foto / do grupo',
                'Cria um produto que não terá foto própria. Se houver um grupo, ele usará a foto compartilhada do grupo.', function () {
                    var grupos = cat.produtos.map(function (p) { return p.grupo; })
                        .filter(function (g) { return g !== undefined && String(g).trim() !== ''; });
                    var novo = { nome: 'Novo produto', preco: 'R$ 0,00', fotoModo: 'grupo' };
                    if (grupos.length) novo.grupo = grupos[grupos.length - 1];
                    cat.produtos.push(novo);
                    rerenderCategory(catIdx);
                }));

            body.appendChild(botaoAdicionar('+ Adicionar produto com foto individual', 'Cria um produto separado, com foto própria.', function () {
                cat.produtos.push({ nome: 'Novo produto', preco: 'R$ 0,00', fotoModo: 'individual' });
                rerenderCategory(catIdx);
            }));
        }

        /* ---------- Excluir categoria ---------- */
        var footerActions = document.createElement('div');
        footerActions.className = 'cat-footer-actions';
        var delCatBtn = document.createElement('button');
        delCatBtn.className = 'btn-danger btn-sm';
        delCatBtn.textContent = 'Excluir categoria';
        delCatBtn.addEventListener('click', function () {
            if (confirm('Excluir a categoria "' + cat.nome + '" e todos os seus produtos?')) {
                E.categorias.splice(catIdx, 1);
                renderCategories();
            }
        });
        footerActions.appendChild(delCatBtn);
        body.appendChild(footerActions);

        card.appendChild(body);
        return card;
    }

    /** Texto de ajuda pequeno. */
    function nota(texto) {
        var el = document.createElement('div');
        el.className = 'lock-note';
        el.textContent = texto;
        return el;
    }

    /** Botão tracejado "+ Adicionar ...". */
    function botaoAdicionar(texto, dica, aoClicar) {
        var btn = document.createElement('button');
        btn.className = 'add-product-btn';
        btn.textContent = texto;
        if (dica) btn.title = dica;
        btn.addEventListener('click', aoClicar);
        return btn;
    }

    /** Pergunta nome, emoji e descrição e cria uma categoria nova (já aberta). */
    function addCategory() {
        var nome = prompt('Nome da nova categoria:');
        if (!nome) return;
        var icone = prompt('Um emoji para representar a categoria (ex.: 🔑):', '📦') || '📦';
        var descricao = prompt('Breve descrição da categoria:', '') || '';
        E.categorias.push({ id: U.slugify(nome), nome: nome, icone: icone, descricao: descricao, produtos: [] });
        renderCategories();
        var ultimo = Editor.dom.catList.lastElementChild;
        if (ultimo) ultimo.classList.add('open');
    }

    Editor.categoriasUI = {
        renderCategories: renderCategories,
        rerenderCategory: rerenderCategory,
        moveCategory: moveCategory,
        addCategory: addCategory
    };
})(window);
