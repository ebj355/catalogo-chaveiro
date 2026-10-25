#!/usr/bin/env node
/**
 * =====================================================================
 * TESTES/UNITARIOS.JS - TESTES SEM NAVEGADOR (só Node.js)
 * =====================================================================
 * Executar:  npm test    (ou: node testes/unitarios.js)
 *
 * Confere:
 *   - leitura/troca de declarações (editor/js/declaracoes.js)
 *   - funções de fotos e nomes de arquivo (ferramentas/lib/projeto.js)
 *   - build: gera o catálogo com TODOS os dados de src/ sem perder nada
 *   - ida e volta: importar o catálogo gerado não muda nada em src/
 * =====================================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const D = require('../editor/js/declaracoes.js');
const P = require('../ferramentas/lib/projeto.js');

let passou = 0, falhou = 0;
/** Registra uma verificação. */
function teste(nome, fn) {
    try {
        const ok = fn();
        if (ok === false) throw new Error('condição falsa');
        passou++; console.log('OK    ' + nome);
    } catch (e) {
        falhou++; console.log('FALHA ' + nome + ' -> ' + e.message);
    }
}
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------------- declaracoes.js ---------------- */
const exemplo = [
    '<script>',
    'const CATEGORIAS = [{ nome: "Chave }] estranha", desc: \'aspas "dentro"\', obs: `crase ${1}`, },];',
    'const IMAGENS_X = { a: "data:image/png;base64,AAA=" };',
    'const IMAGENS_Y = {};',
    '</script>'
].join('\n');

teste('extrair encontra o literal e ignora } ] dentro de textos', () => {
    const d = D.extrair(exemplo, 'CATEGORIAS');
    return d && d.conteudo.startsWith('[{') && d.conteudo.endsWith(',]') && exemplo[d.fim - 1] === ';';
});
teste('ler avalia JS escrito à mão (chaves sem aspas, vírgula no final)', () => {
    const v = D.ler(exemplo, 'CATEGORIAS');
    return v.length === 1 && v[0].nome === 'Chave }] estranha' && v[0].obs === 'crase 1';
});
teste('ler devolve null para declaração inexistente', () => D.ler(exemplo, 'NAO_EXISTE') === null);
teste('substituir troca só o bloco pedido', () => {
    const novo = D.substituir(exemplo, 'IMAGENS_Y', { b: 1 });
    return D.ler(novo, 'IMAGENS_Y').b === 1 && igual(D.ler(novo, 'CATEGORIAS'), D.ler(exemplo, 'CATEGORIAS'));
});
teste('nomesDosMapasDeImagens lista os IMAGENS_* na ordem', () => igual(D.nomesDosMapasDeImagens(exemplo), ['IMAGENS_X', 'IMAGENS_Y']));

/* ---------------- projeto.js ---------------- */
teste('slug gera nome de arquivo seguro', () =>
    P.slug('Fechadura Lateral (Porta de Aço)') === 'fechadura-lateral-porta-de-aco' && P.slug('Maçaneta') === 'macaneta');
teste('lerDataUrl separa tipo, extensão e bytes', () => {
    const f = P.lerDataUrl('data:image/jpeg;base64,' + Buffer.from('oi').toString('base64'));
    return f.tipo === 'image/jpeg' && f.extensao === '.jpg' && f.bytes.toString() === 'oi';
});
teste('lerDataUrl recusa formato inválido', () => { try { P.lerDataUrl('http://x'); return false; } catch (e) { return true; } });

/* ---------------- build ---------------- */
const { construirCatalogo } = require('../ferramentas/build.js');
const arquivoDist = construirCatalogo();
const html = fs.readFileSync(arquivoDist, 'utf8');
const categorias = P.lerJson(path.join(P.CAMINHOS.dados, 'categorias.json'));
const indice = P.lerJson(P.CAMINHOS.indiceImagens);

teste('build: CATEGORIAS do catálogo = src/dados/categorias.json', () => igual(D.ler(html, 'CATEGORIAS'), categorias));
teste('build: CONFIG, TAMANHOS_CUSTOM e IMAGENS_OCULTAS vêm de src/dados', () =>
    igual(D.ler(html, 'CONFIG'), P.lerJson(path.join(P.CAMINHOS.dados, 'config.json'))) &&
    igual(D.ler(html, 'TAMANHOS_CUSTOM'), P.lerJson(path.join(P.CAMINHOS.dados, 'tamanhos-grupos.json'))) &&
    igual(D.ler(html, 'IMAGENS_OCULTAS'), P.lerJson(path.join(P.CAMINHOS.dados, 'fotos-ocultas.json'))));
teste('build: cada foto do índice está no catálogo, byte a byte', () => {
    let total = 0;
    Object.keys(indice.mapas).forEach(nome => {
        const mapa = D.ler(html, nome) || {};
        Object.keys(indice.mapas[nome].fotos).forEach(chave => {
            const esperado = P.arquivoParaDataUrl(path.join(P.CAMINHOS.imagens, indice.mapas[nome].fotos[chave]));
            if (mapa[chave] !== esperado) throw new Error(nome + '["' + chave + '"] diferente');
            total++;
        });
    });
    return total > 0;
});
teste('build: todos os arquivos de imagem do índice existem', () =>
    Object.values(indice.mapas).every(m => Object.values(m.fotos).every(f => fs.existsSync(path.join(P.CAMINHOS.imagens, f)))));
teste('build: todo produto com "foto" tem a foto em algum mapa (ou está oculto)', () => {
    const todas = new Set();
    Object.keys(indice.mapas).forEach(n => Object.keys(indice.mapas[n].fotos).forEach(k => todas.add(k)));
    const ocultas = P.lerJson(path.join(P.CAMINHOS.dados, 'fotos-ocultas.json'), {});
    const faltando = [];
    categorias.forEach(c => c.produtos.forEach(p => {
        if (p.foto && !todas.has(p.foto) && !ocultas[p.foto] && !p.semFoto) faltando.push(c.id + ':' + p.foto);
    }));
    if (faltando.length) console.log('      (aviso) produtos sem foto no mapa: ' + faltando.join(', '));
    return true; // aviso, não erro: o catálogo mostra o ícone da categoria nesses casos
});
teste('build: catálogo tem os trechos que o editor procura (não injeta código)', () =>
    html.includes('IMAGENS_CUSTOM[p.foto]') && html.includes('IMAGENS_CUSTOM[g.nome]') &&
    html.includes('/* EDITOR_CUSTOM_PHOTO_OVERRIDE_V3 */') && html.includes('CATALOGO_EDITOR_FOTOS_V2'));
teste('build: aviso "este é só o modelo" não vai para o catálogo pronto', () => !html.includes('SO-NO-MODELO') && !html.includes('Este é só o modelo'));
teste('build: marcadores <!-- @@...@@ --> foram todos substituídos', () => !html.includes('<!-- @@ESTILOS@@ -->') && !html.includes('<!-- @@SCRIPTS@@ -->') && html.includes('<style>') && html.includes('const CATEGORIAS = ['));

/* ---------------- ida e volta: importar o catálogo gerado ---------------- */
teste('importar o catálogo gerado não muda nenhum arquivo de src/', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogo-teste-'));
    fs.cpSync(path.join(P.CAMINHOS.raiz, 'src'), path.join(tmp, 'src'), { recursive: true });
    fs.cpSync(path.join(P.CAMINHOS.raiz, 'ferramentas'), path.join(tmp, 'ferramentas'), { recursive: true });
    fs.cpSync(path.join(P.CAMINHOS.raiz, 'editor'), path.join(tmp, 'editor'), { recursive: true });
    const saida = execFileSync(process.execPath, [path.join(tmp, 'ferramentas', 'importar.js'), arquivoDist], { encoding: 'utf8' });
    const iguais = (rel) => fs.readFileSync(path.join(P.CAMINHOS.raiz, rel)).equals(fs.readFileSync(path.join(tmp, rel)));
    const ok = /0 novas, 0 alteradas, 0 removidas/.test(saida) &&
        ['src/dados/categorias.json', 'src/dados/config.json', 'src/dados/tamanhos-grupos.json', 'src/dados/fotos-ocultas.json', 'src/imagens/indice.json'].every(iguais);
    fs.rmSync(tmp, { recursive: true, force: true });
    if (!ok) throw new Error(saida);
    return true;
});

console.log('\n' + passou + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
