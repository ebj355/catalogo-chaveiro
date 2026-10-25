/**
 * =====================================================================
 * RENDER-FECHADURAS.JS - GRUPOS DE FECHADURA E SEUS ITENS
 * =====================================================================
 *
 * Na categoria "fechaduras", produtos seguidos com o mesmo "grupo"
 * formam um modelo (ex.: "Fechadura Gorge") com:
 *   - UMA foto compartilhada pelo grupo (IMAGENS_CUSTOM[nome do grupo]
 *     ou a original em IMAGENS_FECHADURA);
 *   - tamanho da foto no catálogo (Padrão/Pequena/Média/Grande),
 *     guardado em TAMANHOS_CUSTOM[nome do grupo];
 *   - os itens em linhas compactas (nome, preço, condição, descrição).
 *     Cada item pode usar a foto do grupo ou ter uma foto individual.
 *
 * Renomear o grupo leva junto a foto, a marcação de foto removida e o
 * tamanho escolhido.
 * =====================================================================
 */
(function (raiz) {
    'use strict';

    var Editor = raiz.Editor;
    var E = Editor.estado;
    var U = Editor.util;

    /**
     * Desenha um grupo de fechadura.
     * @param {object} cat    categoria "fechaduras"
     * @param {{nome:string, itens:{prod:object, prodIdx:number}[]}} grupo
     * @param {number} catIdx posição da categoria
     * @returns {HTMLDivElement}
     */
    function renderLockGroupCard(cat, grupo, catIdx) {
        var card = document.createElement('div');
        card.className = 'lock-group-card';
        var nomeAtual = grupo.nome || '';

        var header = document.createElement('div');
        header.className = 'lock-group-header';

        /* ---------- Foto do grupo ---------- */
        var photoColumn = document.createElement('div');
        photoColumn.className = 'coluna-foto';
        var photoBox = document.createElement('div');
        photoBox.className = 'photo-box lock-group-photo-box';
        var chooseBtn = document.createElement('button');
        chooseBtn.type = 'button';
        chooseBtn.className = 'btn-ghost btn-sm';
        chooseBtn.textContent = 'Escolher foto';
        var photoInput = U.seletorDeFoto();

        /** Redesenha a foto do grupo (ou o aviso "Foto do grupo"). */
        function paintPhotoBox() {
            photoBox.innerHTML = '';
            var src = Editor.fotos.findGroupPhotoSrc(nomeAtual);
            if (src) {
                var img = document.createElement('img');
                img.src = src;
                img.alt = nomeAtual || 'Grupo';
                photoBox.appendChild(img);
                photoBox.appendChild(U.botaoRemoverFoto('Remover foto do grupo', function () {
                    if (nomeAtual) {
                        delete E.imagensCustom[nomeAtual];
                        E.imagensOcultas['group:' + nomeAtual] = true;
                    }
                    paintPhotoBox();
                }));
            } else {
                var lbl = document.createElement('div');
                lbl.className = 'ph-label';
                lbl.textContent = 'Foto do grupo';
                photoBox.appendChild(lbl);
            }
        }

        chooseBtn.addEventListener('click', function () {
            if (!nomeAtual.trim()) { alert('Primeiro informe o nome do grupo.'); return; }
            photoInput.click();
        });
        photoInput.addEventListener('change', function (e) {
            var file = e.target.files && e.target.files[0];
            if (!file || !nomeAtual.trim()) return;
            U.lerFoto(file, function (dataUrl) {
                E.imagensCustom[nomeAtual] = dataUrl;
                delete E.imagensOcultas['group:' + nomeAtual];
                paintPhotoBox();
            });
            photoInput.value = '';
        });
        paintPhotoBox();
        photoColumn.appendChild(photoBox);
        photoColumn.appendChild(chooseBtn);
        photoColumn.appendChild(photoInput);
        header.appendChild(photoColumn);

        /* ---------- Nome e tamanho da foto ---------- */
        var headerFields = document.createElement('div');
        headerFields.className = 'lock-group-header-fields';
        headerFields.innerHTML =
            '<label>Nome do grupo</label>' +
            '<input type="text" data-field="grupo-nome" value="' + U.escapeAttr(nomeAtual) + '">' +
            '<label>Tamanho da foto no catálogo</label>' +
            '<select data-field="grupo-tamanho">' +
            Editor.TAMANHOS_GRUPO.map(function (t) { return '<option value="' + t.valor + '">' + t.label + '</option>'; }).join('') +
            '</select>';
        var nomeInput = headerFields.querySelector('[data-field="grupo-nome"]');
        var tamanhoSelect = headerFields.querySelector('[data-field="grupo-tamanho"]');
        tamanhoSelect.value = E.tamanhosCustom[nomeAtual] ? String(E.tamanhosCustom[nomeAtual]) : '';

        nomeInput.addEventListener('change', function (e) {
            var novoNome = e.target.value.trim();
            if (!novoNome) { e.target.value = nomeAtual; return; } // nome vazio não vale
            if (nomeAtual !== novoNome) {
                // Leva a foto, a marcação de "removida" e o tamanho para o novo nome
                if (E.imagensCustom[nomeAtual]) E.imagensCustom[novoNome] = E.imagensCustom[nomeAtual];
                if (E.imagensOcultas['group:' + nomeAtual]) E.imagensOcultas['group:' + novoNome] = E.imagensOcultas['group:' + nomeAtual];
                if (E.tamanhosCustom[nomeAtual] !== undefined) E.tamanhosCustom[novoNome] = E.tamanhosCustom[nomeAtual];
                delete E.imagensCustom[nomeAtual];
                delete E.imagensOcultas['group:' + nomeAtual];
                delete E.tamanhosCustom[nomeAtual];
            }
            grupo.itens.forEach(function (it) { it.prod.grupo = novoNome; });
            nomeAtual = novoNome;
            paintPhotoBox();
            tamanhoSelect.value = E.tamanhosCustom[nomeAtual] ? String(E.tamanhosCustom[nomeAtual]) : '';
        });
        tamanhoSelect.addEventListener('change', function (e) {
            if (e.target.value) E.tamanhosCustom[nomeAtual] = Number(e.target.value);
            else delete E.tamanhosCustom[nomeAtual];
        });
        header.appendChild(headerFields);

        /* ---------- Excluir grupo ---------- */
        var headerActions = document.createElement('div');
        headerActions.className = 'lock-group-header-actions';
        var delGroupBtn = document.createElement('button');
        delGroupBtn.className = 'btn-danger btn-sm';
        delGroupBtn.textContent = 'Excluir grupo';
        delGroupBtn.addEventListener('click', function () {
            if (!confirm('Excluir o grupo "' + nomeAtual + '" e todos os seus ' + grupo.itens.length + ' item(ns)?')) return;
            // remove do fim para o começo, para os índices não mudarem no meio
            grupo.itens.map(function (it) { return it.prodIdx; })
                .sort(function (a, b) { return b - a; })
                .forEach(function (idx) { cat.produtos.splice(idx, 1); });
            delete E.imagensCustom[nomeAtual];
            delete E.imagensOcultas['group:' + nomeAtual];
            delete E.tamanhosCustom[nomeAtual];
            Editor.categoriasUI.rerenderCategory(catIdx);
        });
        headerActions.appendChild(delGroupBtn);
        header.appendChild(headerActions);
        card.appendChild(header);

        /* ---------- Itens ---------- */
        var itemsWrap = document.createElement('div');
        itemsWrap.className = 'lock-group-items-list';
        grupo.itens.forEach(function (it) {
            itemsWrap.appendChild(renderLockItemRow(cat, it.prod, it.prodIdx, catIdx));
        });
        card.appendChild(itemsWrap);

        var addItemBtn = document.createElement('button');
        addItemBtn.className = 'add-product-btn btn-sm';
        addItemBtn.textContent = '+ Adicionar item a este grupo';
        addItemBtn.addEventListener('click', function () {
            // o item novo entra logo depois do último item do grupo
            var lastIdx = grupo.itens.length ? grupo.itens[grupo.itens.length - 1].prodIdx : cat.produtos.length - 1;
            cat.produtos.splice(lastIdx + 1, 0, { nome: 'Novo item', preco: 'R$ 0,00', grupo: nomeAtual, fotoModo: 'grupo' });
            Editor.categoriasUI.rerenderCategory(catIdx);
        });
        card.appendChild(addItemBtn);
        return card;
    }

    /**
     * Linha de um item dentro de um grupo de fechadura.
     * O item pode usar a foto do grupo OU uma foto própria (individual).
     * @returns {HTMLDivElement}
     */
    function renderLockItemRow(cat, prod, prodIdx, catIdx) {
        var row = document.createElement('div');
        row.className = 'lock-item-row';

        /* ---------- Modo de foto ---------- */
        var modeWrap = document.createElement('div');
        modeWrap.className = 'coluna-modo';
        var modeLabel = document.createElement('label');
        modeLabel.className = 'rotulo-campo';
        modeLabel.textContent = 'Foto do item';
        modeWrap.appendChild(modeLabel);
        var modeSelect = document.createElement('select');
        modeSelect.className = 'campo-select';
        modeSelect.innerHTML = '<option value="grupo">Foto do grupo</option><option value="individual">Foto individual</option>';
        modeSelect.value = prod.fotoModo === 'individual' ? 'individual' : 'grupo';
        modeWrap.appendChild(modeSelect);
        row.appendChild(modeWrap);

        /* ---------- Foto individual ---------- */
        var photoColumn = document.createElement('div');
        photoColumn.className = 'coluna-foto';
        var photoBox = document.createElement('div');
        photoBox.className = 'photo-box lock-item-photo-box';
        var chooseBtn = document.createElement('button');
        chooseBtn.type = 'button';
        chooseBtn.className = 'btn-ghost btn-sm';
        chooseBtn.textContent = 'Escolher foto';
        var photoInput = U.seletorDeFoto();

        /** Mostra a foto individual, ou "Usando foto do grupo" / "Sem foto individual". */
        function paintPhotoBox() {
            photoBox.innerHTML = '';
            var individual = prod.fotoModo === 'individual';
            var src = individual ? Editor.fotos.findPhotoSrc(prod.foto, cat) : null;
            if (src) {
                var img = document.createElement('img');
                img.src = src;
                img.alt = prod.nome || 'Produto';
                photoBox.appendChild(img);
                photoBox.appendChild(U.botaoRemoverFoto('Remover foto individual', function () {
                    if (prod.foto) {
                        delete E.imagensCustom[prod.foto];
                        E.imagensOcultas[prod.foto] = true;
                        delete prod.foto;
                    }
                    paintPhotoBox();
                }));
            } else {
                var lbl = document.createElement('div');
                lbl.className = 'ph-label';
                lbl.textContent = individual ? 'Sem foto individual' : 'Usando foto do grupo';
                photoBox.appendChild(lbl);
            }
        }

        chooseBtn.addEventListener('click', function () {
            // escolher foto já coloca o item em "Foto individual"
            if (prod.fotoModo !== 'individual') {
                modeSelect.value = 'individual';
                prod.fotoModo = 'individual';
                paintPhotoBox();
            }
            photoInput.click();
        });
        photoInput.addEventListener('change', function (e) {
            var file = e.target.files && e.target.files[0];
            if (!file) return;
            U.lerFoto(file, function (dataUrl) {
                var key = prod.foto || U.uniqueFotoKey();
                E.imagensCustom[key] = dataUrl;
                delete E.imagensOcultas[key];
                prod.foto = key;
                prod.fotoModo = 'individual';
                delete prod.semFoto;
                modeSelect.value = 'individual';
                paintPhotoBox();
            });
            photoInput.value = '';
        });
        modeSelect.addEventListener('change', function (e) {
            prod.fotoModo = e.target.value;
            if (prod.fotoModo === 'grupo') delete prod.semFoto;
            paintPhotoBox();
        });
        paintPhotoBox();
        photoColumn.appendChild(photoBox);
        photoColumn.appendChild(chooseBtn);
        photoColumn.appendChild(photoInput);
        row.appendChild(photoColumn);

        /* ---------- Campos ---------- */
        var fields = document.createElement('div');
        fields.className = 'product-fields lock-item-fields';
        fields.appendChild(U.campoDoProduto(prod, 'Nome', 'nome', true, false));
        fields.appendChild(U.campoDoProduto(prod, 'Preço', 'preco', false, false));
        fields.appendChild(U.campoDoProduto(prod, 'Condição (opcional)', 'condicao', false, false));
        fields.appendChild(U.campoDoProduto(prod, 'Descrição (opcional)', 'desc', true, true));
        row.appendChild(fields);

        /* ---------- Excluir item ---------- */
        var delBtn = document.createElement('button');
        delBtn.className = 'btn-danger btn-sm lock-item-del';
        delBtn.textContent = 'Excluir';
        delBtn.addEventListener('click', function () {
            cat.produtos.splice(prodIdx, 1);
            Editor.categoriasUI.rerenderCategory(catIdx);
        });
        row.appendChild(delBtn);
        return row;
    }

    Editor.fechadurasUI = { renderLockGroupCard: renderLockGroupCard, renderLockItemRow: renderLockItemRow };
})(window);
