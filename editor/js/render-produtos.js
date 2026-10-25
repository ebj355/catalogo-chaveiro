/**
 * =====================================================================
 * RENDER-PRODUTOS.JS - CARTÃO DE UM PRODUTO COMUM
 * =====================================================================
 *
 * Usado em todas as categorias, exceto "fechaduras" (essa tem o seu
 * próprio layout por grupo, em render-fechaduras.js).
 *
 * O cartão tem:
 *   [caixa de foto] [nome, grupo, preço, condição, modo de foto, descrição] [Excluir]
 *
 * Modos de foto:
 *   - Individual: a foto é só deste produto. Fica em IMAGENS_CUSTOM com
 *     uma chave única, gravada no campo "foto" do produto.
 *   - Uma foto para o grupo: todos os produtos do mesmo "grupo" mostram a
 *     mesma foto, guardada em IMAGENS_CUSTOM com o NOME do grupo como chave.
 *
 * Correção (out/2026): a versão anterior usava "fields" e "fieldBlock"
 * sem criá-los nesta função, e o editor quebrava ao abrir qualquer
 * catálogo ("fields is not defined"). Agora os campos são criados aqui.
 * =====================================================================
 */
(function (raiz) {
    'use strict';

    var Editor = raiz.Editor;
    var E = Editor.estado;
    var U = Editor.util;

    /**
     * Desenha o cartão de um produto.
     * @param {object} cat     categoria do produto
     * @param {object} prod    produto (alterado diretamente pelos campos)
     * @param {number} prodIdx posição do produto em cat.produtos
     * @returns {HTMLDivElement}
     */
    function renderProductCard(cat, prod, prodIdx) {
        var card = document.createElement('div');
        card.className = 'product-card';

        /* ---------- Caixa de foto ---------- */
        var photoBox = document.createElement('div');
        photoBox.className = 'photo-box';
        var photoInput = U.seletorDeFoto();

        /** Redesenha a caixa: a foto atual com "×" para remover, ou o convite para adicionar. */
        function paintPhotoBox() {
            while (photoBox.firstChild) photoBox.removeChild(photoBox.firstChild);
            var isGroup = prod.fotoModo === 'grupo';
            var src = Editor.fotos.findProductPhotoSrc(cat, prod);
            if (src) {
                var img = document.createElement('img');
                img.src = src;
                img.alt = prod.nome || 'Produto';
                photoBox.appendChild(img);
                photoBox.appendChild(U.botaoRemoverFoto(isGroup ? 'Remover foto do grupo' : 'Remover foto individual', function () {
                    if (isGroup && prod.grupo) {
                        delete E.imagensCustom[prod.grupo];
                        E.imagensOcultas['group:' + prod.grupo] = true;
                    } else if (prod.foto) {
                        delete E.imagensCustom[prod.foto];
                        E.imagensOcultas[prod.foto] = true;
                        delete prod.foto;
                    }
                    prod.semFoto = true; // o catálogo mostra o ícone da categoria
                    paintPhotoBox();
                }));
            } else {
                var lbl = document.createElement('div');
                lbl.className = 'ph-label';
                lbl.textContent = isGroup ? 'Adicionar foto do grupo' : 'Adicionar foto individual';
                photoBox.appendChild(lbl);
            }
            photoBox.appendChild(photoInput);
        }

        photoBox.addEventListener('click', function (ev) {
            if (ev.target.closest('.remove-photo')) return;
            photoInput.click();
        });

        photoInput.addEventListener('change', function (e) {
            var file = e.target.files && e.target.files[0];
            if (!file) return;
            U.lerFoto(file, function (dataUrl) {
                if (prod.fotoModo === 'grupo') {
                    if (!prod.grupo) prod.grupo = prompt('Nome do grupo para compartilhar a foto:', '') || '';
                    if (!prod.grupo) return;
                    // Foto de grupo usa o próprio nome do grupo como chave
                    E.imagensCustom[prod.grupo] = dataUrl;
                    delete E.imagensOcultas['group:' + prod.grupo];
                    // Produto em modo grupo não guarda foto individual
                    if (prod.foto) {
                        delete E.imagensCustom[prod.foto];
                        delete prod.foto;
                    }
                } else {
                    var key = prod.foto || U.uniqueFotoKey();
                    E.imagensCustom[key] = dataUrl;
                    delete E.imagensOcultas[key];
                    prod.foto = key;
                }
                delete prod.semFoto;
                paintPhotoBox();
            });
            photoInput.value = ''; // permite escolher a mesma imagem de novo
        });
        paintPhotoBox();
        card.appendChild(photoBox);

        /* ---------- Campos ---------- */
        var fields = document.createElement('div');
        fields.className = 'product-fields';
        fields.appendChild(U.campoDoProduto(prod, 'Nome', 'nome', true, false));
        if (prod.grupo !== undefined) fields.appendChild(U.campoDoProduto(prod, 'Grupo', 'grupo', true, false));
        fields.appendChild(U.campoDoProduto(prod, 'Preço', 'preco', false, false));
        fields.appendChild(U.campoDoProduto(prod, 'Condição (opcional)', 'condicao', false, false));
        fields.appendChild(seletorDeModo(cat, prod));
        fields.appendChild(U.campoDoProduto(prod, 'Descrição (opcional)', 'desc', true, true));
        card.appendChild(fields);

        /* ---------- Ações ---------- */
        var actions = document.createElement('div');
        actions.className = 'product-actions';
        var delBtn = document.createElement('button');
        delBtn.className = 'btn-danger btn-sm';
        delBtn.textContent = 'Excluir';
        delBtn.addEventListener('click', function () {
            cat.produtos.splice(prodIdx, 1);
            Editor.categoriasUI.rerenderCategory(E.categorias.indexOf(cat));
        });
        actions.appendChild(delBtn);
        card.appendChild(actions);
        return card;
    }

    /**
     * Select "Foto: Individual / Uma foto para o grupo".
     * Ao passar para "grupo" sem grupo definido, pergunta o nome do grupo.
     */
    function seletorDeModo(cat, prod) {
        var wrap = document.createElement('div');
        var label = document.createElement('label');
        label.textContent = 'Foto';
        wrap.appendChild(label);

        var select = document.createElement('select');
        select.className = 'campo-select';
        select.innerHTML = '<option value="individual">Individual</option><option value="grupo">Uma foto para o grupo</option>';
        select.value = prod.fotoModo === 'grupo' ? 'grupo' : 'individual';
        select.addEventListener('change', function (e) {
            prod.fotoModo = e.target.value;
            if (prod.fotoModo === 'grupo' && !prod.grupo) {
                prod.grupo = prompt('Nome do grupo para compartilhar a foto:', '') || '';
            }
            if (prod.fotoModo === 'individual') delete prod.fotoModo; // individual é o padrão: não grava
            Editor.categoriasUI.rerenderCategory(E.categorias.indexOf(cat));
        });
        wrap.appendChild(select);
        return wrap;
    }

    Editor.produtosUI = { renderProductCard: renderProductCard };
})(window);
