#!/usr/bin/env node
/**
 * =====================================================================
 * FERRAMENTAS/BUILD.JS - MONTA OS ARQUIVOS PRONTOS EM dist/
 * =====================================================================
 *
 * Uso:
 *     node ferramentas/build.js        (ou: npm run build)
 *
 * Gera:
 *   dist/catalogo-chaveiro-senador.html
 *       o catálogo completo em UM arquivo: src/modelo-catalogo.html com o CSS
 *       (src/css), os dados (src/dados), as fotos em base64 (src/imagens)
 *       e o código (src/js) colados dentro dele. Funciona offline e é o
 *       arquivo que se abre no editor.
 *
 *   dist/editor-catalogo.html
 *       o editor (editor/index.html + css + js) também em um só arquivo,
 *       para ser copiado ou enviado sem a pasta junto.
 *
 * O formato das declarações (const CATEGORIAS = [...], const IMAGENS_X = {...})
 * é o que o editor sabe ler e regravar. Não mude esses nomes.
 * =====================================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const P = require('./lib/projeto.js');

/* Arquivos de código do catálogo, na ordem em que entram no <script> */
const CSS_DO_CATALOGO = ['src/css/catalogo.css', 'src/css/ajustes-fotos.css'];
const JS_DO_CATALOGO = ['src/js/fotos.js', 'src/js/paginas.js', 'src/js/livro.js', 'src/js/menu.js'];

/**
 * Escreve "const NOME = {...};" com uma foto por linha
 * (mesmo formato do catálogo original, fácil de ler e de comparar).
 */
function declararMapa(nome, fotos) {
    const chaves = Object.keys(fotos);
    if (!chaves.length) return 'const ' + nome + ' = {};';
    const linhas = chaves.map(k => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(fotos[k]));
    return 'const ' + nome + ' = {\n' + linhas.join(',\n') + '\n};';
}

/**
 * Monta o bloco de dados do <script>: CONFIG, logo, mapas de fotos,
 * ajustes do editor e CATEGORIAS.
 * @returns {string}
 */
function blocoDeDados() {
    const indice = P.lerJson(P.CAMINHOS.indiceImagens, null);
    if (!indice) throw new Error('src/imagens/indice.json não existe. Rode primeiro: npm run importar -- <catalogo.html>');
    const config = P.lerJson(path.join(P.CAMINHOS.dados, 'config.json'), { nomeLoja: '', subtitulo: '' });
    const categorias = P.lerJson(path.join(P.CAMINHOS.dados, 'categorias.json'), []);
    const tamanhos = P.lerJson(path.join(P.CAMINHOS.dados, 'tamanhos-grupos.json'), {});
    const ocultas = P.lerJson(path.join(P.CAMINHOS.dados, 'fotos-ocultas.json'), {});

    /** Carrega todas as fotos de um mapa como data URL. */
    const fotosDoMapa = (nome) => {
        const entrada = indice.mapas[nome];
        const fotos = {};
        if (!entrada) return fotos;
        Object.keys(entrada.fotos).forEach(chave => {
            fotos[chave] = P.arquivoParaDataUrl(path.join(P.CAMINHOS.imagens, entrada.fotos[chave]));
        });
        return fotos;
    };

    // Todos os mapas conhecidos são sempre declarados (mesmo vazios), porque
    // src/js/fotos.js usa todos. Mapas extras vindos de importação vão no fim.
    const nomes = P.MAPAS.map(m => m.nome).filter(n => n !== 'IMAGENS_CUSTOM')
        .concat(Object.keys(indice.mapas).filter(n => !P.MAPAS.some(m => m.nome === n)));

    const partes = [
        '/* =====================================================================',
        '   DADOS DO CATÁLOGO - GERADO PELO BUILD (ferramentas/build.js)',
        '   Origem: src/dados/*.json e src/imagens/. Para mudar produtos e fotos,',
        '   use o editor e depois "npm run importar", ou edite os arquivos em src/.',
        '   ===================================================================== */',
        '',
        '/* Nome e subtítulo da loja (src/dados/config.json) */',
        'const CONFIG = ' + JSON.stringify(config, null, 2) + ';',
        '',
        '/* Logo da capa (src/imagens/' + indice.logo + ') */',
        'const LOGO_CHAVEIRO = ' + JSON.stringify(indice.logo ? P.arquivoParaDataUrl(path.join(P.CAMINHOS.imagens, indice.logo)) : '') + ';',
        '',
        '/* Fotos originais de cada categoria (src/imagens/<pasta>/) */'
    ];
    nomes.forEach(nome => {
        partes.push('/* ' + P.infoDoMapa(nome).descricao + ' */');
        partes.push(declararMapa(nome, fotosDoMapa(nome)));
        partes.push('');
    });
    partes.push(
        '/* Fotos adicionadas/trocadas pelo editor (src/imagens/custom/). Têm prioridade. */',
        declararMapa('IMAGENS_CUSTOM', fotosDoMapa('IMAGENS_CUSTOM')),
        '',
        '/* Fotos removidas no editor: chave da foto, ou "group:<nome do grupo>" (src/dados/fotos-ocultas.json) */',
        'const IMAGENS_OCULTAS = ' + JSON.stringify(ocultas, null, 2) + ';',
        '',
        '/* Largura (px) da foto de cada grupo de fechadura escolhida no editor (src/dados/tamanhos-grupos.json) */',
        'const TAMANHOS_CUSTOM = ' + JSON.stringify(tamanhos, null, 2) + ';',
        '',
        '/* Categorias e produtos (src/dados/categorias.json) */',
        'const CATEGORIAS = ' + JSON.stringify(categorias, null, 2) + ';'
    );
    return partes.join('\n');
}

/** Gera dist/catalogo-chaveiro-senador.html. */
function construirCatalogo() {
    const modelo = P.lerTexto('src/modelo-catalogo.html');
    const css = CSS_DO_CATALOGO.map(P.lerTexto).join('\n');
    const js = JS_DO_CATALOGO.map(arquivo => '/* ----- ' + arquivo + ' ----- */\n' + P.lerTexto(arquivo)).join('\n');

    // Cada marcador precisa aparecer exatamente uma vez (e fora de outros comentários)
    ['<!-- @@ESTILOS@@ -->', '<!-- @@SCRIPTS@@ -->'].forEach(marcador => {
        const vezes = modelo.split(marcador).length - 1;
        if (vezes !== 1) throw new Error('src/modelo-catalogo.html deve ter o marcador ' + marcador + ' exatamente 1 vez (tem ' + vezes + ')');
    });
    // Funções de substituição: evitam que um "$" dentro do código seja interpretado.
    // O aviso "este é só o modelo" (entre os marcadores SO-NO-MODELO) não vai para o catálogo pronto.
    const html = modelo
        .replace(/<!-- @@SO-NO-MODELO:INICIO -->[\s\S]*?<!-- @@SO-NO-MODELO:FIM -->\n*/, '')
        .replace('<!-- @@ESTILOS@@ -->', () => '<style>\n' + css + '</style>')
        .replace('<!-- @@SCRIPTS@@ -->', () => '<script>\n' + blocoDeDados() + '\n\n' + js + '</script>');

    const destino = path.join(P.CAMINHOS.dist, 'catalogo-chaveiro-senador.html');
    fs.mkdirSync(P.CAMINHOS.dist, { recursive: true });
    fs.writeFileSync(destino, html, 'utf8');
    return destino;
}

/**
 * Gera dist/editor-catalogo.html: troca cada <link href="css/..."> e
 * <script src="js/..."> do editor/index.html pelo conteúdo do arquivo.
 */
function construirEditor() {
    let html = fs.readFileSync(path.join(P.CAMINHOS.editor, 'index.html'), 'utf8');
    html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, arquivo) =>
        '<style>\n/* ----- editor/' + arquivo + ' ----- */\n' + fs.readFileSync(path.join(P.CAMINHOS.editor, arquivo), 'utf8') + '</style>');
    html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, arquivo) =>
        '<script>\n/* ----- editor/' + arquivo + ' ----- */\n' + fs.readFileSync(path.join(P.CAMINHOS.editor, arquivo), 'utf8') + '</script>');
    const destino = path.join(P.CAMINHOS.dist, 'editor-catalogo.html');
    fs.mkdirSync(P.CAMINHOS.dist, { recursive: true });
    fs.writeFileSync(destino, html, 'utf8');
    return destino;
}

/** Roda o build completo e mostra o tamanho dos arquivos gerados. */
function construir(opcoes) {
    opcoes = opcoes || {};
    const gerados = [construirCatalogo()];
    if (fs.existsSync(path.join(P.CAMINHOS.editor, 'index.html'))) gerados.push(construirEditor());
    if (!opcoes.silencioso) {
        gerados.forEach(arquivo => {
            const kb = Math.round(fs.statSync(arquivo).size / 1024);
            console.log('Gerado: ' + path.relative(P.CAMINHOS.raiz, arquivo) + ' (' + kb + ' KB)');
        });
    }
    return gerados;
}

module.exports = { construir, construirCatalogo, construirEditor, blocoDeDados };

if (require.main === module) {
    try {
        construir();
    } catch (e) {
        console.error('Erro: ' + e.message);
        process.exit(1);
    }
}
