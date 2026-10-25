#!/usr/bin/env node
/**
 * =====================================================================
 * TESTES/E2E.JS - TESTES NO NAVEGADOR (catálogo + editor + importação)
 * =====================================================================
 * Executar:  npm run test:e2e
 * Requer Playwright:  npm install  &&  npx playwright install chromium
 *
 * Simula o uso real:
 *   1. o catálogo gerado abre, vira páginas, índice e menu funcionam
 *   2. no editor: muda preço, põe foto individual, remove foto, troca a
 *      foto e o tamanho de um grupo de fechadura, foto própria de um item
 *      e cria uma categoria; baixa o catálogo atualizado
 *   3. o catálogo baixado mostra todas essas mudanças
 *   4. um catálogo no formato ANTIGO também recebe as fotos do editor
 *   5. importar o catálogo baixado + build reproduz exatamente o mesmo
 * =====================================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const D = require('../editor/js/declaracoes.js');
const P = require('../ferramentas/lib/projeto.js');

const RAIZ = P.CAMINHOS.raiz;
const CATALOGO = path.join(RAIZ, 'dist', 'catalogo-chaveiro-senador.html');
const EDITOR = path.join(RAIZ, 'editor', 'index.html');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogo-e2e-'));

// Fotos usadas como "uploads" (qualquer imagem serve; usamos as do projeto)
const FOTO_PRODUTO = path.join(P.CAMINHOS.imagens, 'chaves', 'keso.png');
const FOTO_GRUPO = path.join(P.CAMINHOS.imagens, 'fechaduras', 'fechadura-gorge.png');
const FOTO_ITEM = path.join(P.CAMINHOS.imagens, 'cadeados', 'mala.png');

let passou = 0, falhou = 0;
function chk(id, desc, cond) {
    if (cond) passou++; else falhou++;
    console.log((cond ? 'OK    ' : 'FALHA ') + id.padEnd(7) + desc);
}

/** Abre um arquivo local numa aba nova, sem baixar fontes da internet. */
async function abrir(nav, arquivo, opcoes) {
    const pg = await nav.newPage(opcoes || {});
    pg.erros = [];
    pg.on('pageerror', e => pg.erros.push(String(e)));
    await pg.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await pg.goto('file://' + arquivo);
    return pg;
}

/** Carrega um catálogo no editor. */
async function carregarNoEditor(nav, arquivoCatalogo, respostas) {
    const pg = await abrir(nav, EDITOR);
    const fila = (respostas || []).slice();
    pg.on('dialog', d => d.accept(d.type() === 'prompt' ? (fila.shift() || '') : undefined));
    await pg.setInputFiles('#file-input', arquivoCatalogo);
    await pg.waitForSelector('.cat-card');
    return pg;
}

/** Clica em "Baixar catálogo atualizado" e salva o arquivo em TMP. */
async function baixar(pg, nome) {
    const [download] = await Promise.all([pg.waitForEvent('download'), pg.click('#save-btn')]);
    const destino = path.join(TMP, nome);
    await download.saveAs(destino);
    return destino;
}

(async () => {
    const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
    const categorias = P.lerJson(path.join(P.CAMINHOS.dados, 'categorias.json'));
    const idx = id => categorias.findIndex(c => c.id === id);

    /* ================= 1. CATÁLOGO ================= */
    {
        const pg = await abrir(nav, CATALOGO, { viewport: { width: 460, height: 900 } });
        await pg.waitForSelector('.stage.ready');
        const total = categorias.length + 2;
        chk('CAT01', `catálogo monta ${total} páginas (capa + índice + ${categorias.length} categorias)`, await pg.locator('.page').count() === total);
        chk('CAT02', 'indicador começa em "1 / ' + total + '"', (await pg.textContent('#pageIndicator')) === '1 / ' + total);
        await pg.click('#nextBtn'); await pg.waitForTimeout(800);
        chk('CAT03', 'seta › vira para a página 2', (await pg.textContent('#pageIndicator')).startsWith('2 /'));
        await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(800);
        chk('CAT04', 'tecla ← volta para a capa', (await pg.textContent('#pageIndicator')).startsWith('1 /'));
        await pg.evaluate(() => document.querySelector('[data-goto="4"]').click());
        chk('CAT05', 'índice pula direto para a categoria (página 5)', (await pg.textContent('#pageIndicator')).startsWith('5 /'));
        await pg.click('#menuBtn'); await pg.waitForTimeout(350);
        chk('CAT06', 'menu "Ir para" abre com todas as páginas', await pg.locator('#menuPanel.open .menu-panel__item').count() === total);
        await pg.evaluate(() => document.querySelector('[data-goto-menu="0"]').click());
        chk('CAT07', 'menu leva para a capa e fecha', (await pg.textContent('#pageIndicator')).startsWith('1 /') && !(await pg.locator('#menuPanel.open').count()));
        chk('CAT08', 'nenhuma foto quebrada', await pg.evaluate(() => [...document.images].every(i => i.complete && i.naturalWidth > 0)));
        chk('CAT09', 'sem erros de JavaScript ' + pg.erros.join(' | '), pg.erros.length === 0);
        await pg.setViewportSize({ width: 360, height: 740 });
        chk('CAT10', 'celular 360px: sem rolagem lateral', await pg.evaluate(() => document.documentElement.scrollWidth <= 360));
        await pg.close();
    }

    /* ================= 2. EDITOR ================= */
    const novaCategoria = ['Promoções', '🏷️', 'Ofertas da semana'];
    const pg = await carregarNoEditor(nav, CATALOGO, novaCategoria);
    chk('EDI01', 'editor abre o catálogo gerado (uma caixa por categoria)', await pg.locator('.cat-card').count() === categorias.length);
    chk('EDI02', 'sem aviso de "versão antiga"', !(await pg.locator('#parse-warning.show').count()));

    // Cópia de chaves: preço, foto individual e remoção de foto
    const copia = pg.locator('.cat-card').nth(idx('copia-chaves'));
    await copia.locator('.cat-head').click();
    const produtos = copia.locator('.product-card');
    await produtos.nth(0).locator('.product-fields > div').filter({ hasText: 'Preço' }).locator('input').fill('R$ 9,99');
    await produtos.nth(1).locator('input[type=file]').setInputFiles(FOTO_PRODUTO);
    await pg.waitForTimeout(300);
    chk('EDI03', 'foto individual aparece na pré-visualização', (await produtos.nth(1).locator('.photo-box img').getAttribute('src')) === P.arquivoParaDataUrl(FOTO_PRODUTO));
    await produtos.nth(2).locator('.remove-photo').click();
    chk('EDI04', 'remover foto deixa a caixa vazia', await produtos.nth(2).locator('.photo-box img').count() === 0);

    // Fechaduras: tamanho e foto do 1º grupo, foto própria do 1º item
    const fech = pg.locator('.cat-card').nth(idx('fechaduras'));
    await fech.locator('.cat-head').click();
    const grupo = fech.locator('.lock-group-card').nth(0);
    await grupo.locator('[data-field="grupo-tamanho"]').selectOption('190');
    await grupo.locator('.lock-group-header input[type=file]').setInputFiles(FOTO_GRUPO);
    await grupo.locator('.lock-item-row').nth(0).locator('input[type=file]').setInputFiles(FOTO_ITEM);
    await pg.waitForTimeout(300);
    chk('EDI05', 'item do grupo passa para "Foto individual" ao receber foto',
        (await grupo.locator('.lock-item-row').nth(0).locator('select').inputValue()) === 'individual');

    // Nova categoria (as respostas dos prompts estão em novaCategoria)
    await pg.click('#add-category-btn');
    chk('EDI06', 'nova categoria criada e aberta', await pg.locator('.cat-card.open .name', { hasText: 'Promoções' }).count() === 1);
    chk('EDI07', 'sem erros de JavaScript no editor ' + pg.erros.join(' | '), pg.erros.length === 0);

    const exportado = await baixar(pg, 'exportado.html');
    await pg.close();

    /* ================= 3. CATÁLOGO EXPORTADO ================= */
    {
        const html = fs.readFileSync(exportado, 'utf8');
        // Zera os 4 blocos de dados nos dois arquivos: o resto tem que ser idêntico
        const semDados = t => ['IMAGENS_CUSTOM', 'IMAGENS_OCULTAS', 'TAMANHOS_CUSTOM', 'CATEGORIAS'].reduce((s, n) => D.substituir(s, n, null), t);
        chk('EXP01', 'exportação só mudou os dados (nenhum código injetado no catálogo novo)',
            semDados(html) === semDados(fs.readFileSync(CATALOGO, 'utf8')));
        const c = await abrir(nav, exportado, { viewport: { width: 460, height: 900 } });
        await c.waitForSelector('.stage.ready');
        const paginas = c.locator('.page');
        chk('EXP02', 'nova categoria vira uma página a mais', await paginas.count() === categorias.length + 3);
        const pCopia = paginas.nth(2 + idx('copia-chaves')).locator('.product');
        chk('EXP03', 'preço alterado aparece no catálogo', (await pCopia.nth(0).locator('.product__price').textContent()) === 'R$ 9,99');
        chk('EXP04', 'foto individual aparece no catálogo', (await pCopia.nth(1).locator('img').getAttribute('src')) === P.arquivoParaDataUrl(FOTO_PRODUTO));
        chk('EXP05', 'foto removida: aparece o ícone da categoria', await pCopia.nth(2).locator('img').count() === 0 &&
            (await pCopia.nth(2).locator('.product__icon').textContent()).trim() === categorias[idx('copia-chaves')].icone);
        const g = paginas.nth(2 + idx('fechaduras')).locator('.lock-group').nth(0);
        chk('EXP06', 'foto do grupo trocada aparece no catálogo', (await g.locator('.lock-group__photo img').getAttribute('src')) === P.arquivoParaDataUrl(FOTO_GRUPO));
        chk('EXP07', 'tamanho "Grande" (190px) aplicado à foto do grupo', (await g.locator('.lock-group__photo').getAttribute('style')) === 'width:190px');
        chk('EXP08', 'foto própria do item aparece ao lado dele', (await g.locator('.lock-item').nth(0).locator('.lock-item__foto img').getAttribute('src')) === P.arquivoParaDataUrl(FOTO_ITEM));
        chk('EXP09', 'sem erros de JavaScript ' + c.erros.join(' | '), c.erros.length === 0);
        await c.close();
    }

    /* ================= 4. CATÁLOGO NO FORMATO ANTIGO ================= */
    {
        // Simula um catálogo antigo: o código original usava uma cadeia de if/else
        // sem o suporte a fotos do editor. Usamos o arquivo original se existir.
        const antigo = process.env.CATALOGO_ANTIGO;
        if (antigo && fs.existsSync(antigo)) {
            const e = await carregarNoEditor(nav, antigo);
            const prod = e.locator('.cat-card').nth(0).locator('.product-card').nth(0);
            await e.locator('.cat-card').nth(0).locator('.cat-head').click();
            await prod.locator('input[type=file]').setInputFiles(FOTO_ITEM);
            await e.waitForTimeout(300);
            const arq = await baixar(e, 'antigo-exportado.html');
            await e.close();
            const c = await abrir(nav, arq);
            await c.waitForSelector('.stage.ready');
            chk('OLD01', 'catálogo antigo exportado mostra a foto nova',
                (await c.locator('.page').nth(2).locator('.product').nth(0).locator('img').getAttribute('src')) === P.arquivoParaDataUrl(FOTO_ITEM));
            chk('OLD02', 'sem erros de JavaScript ' + c.erros.join(' | '), c.erros.length === 0);
            await c.close();
        } else {
            console.log('(pulado) defina CATALOGO_ANTIGO=caminho/do/catalogo-antigo.html para testar o formato antigo');
        }
    }

    /* ================= 5. IMPORTAR + BUILD ================= */
    {
        const copiaProjeto = path.join(TMP, 'projeto');
        ['src', 'ferramentas', 'editor'].forEach(p => fs.cpSync(path.join(RAIZ, p), path.join(copiaProjeto, p), { recursive: true }));
        const saida = execFileSync(process.execPath, [path.join(copiaProjeto, 'ferramentas', 'importar.js'), exportado], { encoding: 'utf8' });
        chk('IMP01', 'importar grava as 3 fotos novas em src/imagens/custom', /3 novas/.test(saida) &&
            fs.readdirSync(path.join(copiaProjeto, 'src', 'imagens', 'custom')).length === 3);
        const cats = P.lerJson(path.join(copiaProjeto, 'src', 'dados', 'categorias.json'));
        chk('IMP02', 'categorias.json recebe a nova categoria e o preço', cats.some(c => c.nome === 'Promoções') && cats[idx('copia-chaves')].produtos[0].preco === 'R$ 9,99');
        chk('IMP03', 'tamanhos-grupos.json recebe o tamanho escolhido', Object.values(P.lerJson(path.join(copiaProjeto, 'src', 'dados', 'tamanhos-grupos.json'))).includes(190));

        execFileSync(process.execPath, [path.join(copiaProjeto, 'ferramentas', 'build.js')], { encoding: 'utf8' });
        const reconstruido = fs.readFileSync(path.join(copiaProjeto, 'dist', 'catalogo-chaveiro-senador.html'), 'utf8');
        const original = fs.readFileSync(exportado, 'utf8');
        const mesmos = ['CATEGORIAS', 'IMAGENS_CUSTOM', 'IMAGENS_OCULTAS', 'TAMANHOS_CUSTOM']
            .every(n => JSON.stringify(D.ler(original, n)) === JSON.stringify(D.ler(reconstruido, n)));
        chk('IMP04', 'build depois de importar gera os MESMOS dados do arquivo baixado', mesmos);
    }

    await nav.close();
    fs.rmSync(TMP, { recursive: true, force: true });
    console.log('\n' + passou + ' passaram, ' + falhou + ' falharam');
    process.exit(falhou ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
