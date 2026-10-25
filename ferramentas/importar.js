#!/usr/bin/env node
/**
 * =====================================================================
 * FERRAMENTAS/IMPORTAR.JS - TRAZ UM CATÁLOGO .HTML DE VOLTA PARA src/
 * =====================================================================
 *
 * Uso:
 *     node ferramentas/importar.js caminho/do/catalogo.html
 *     npm run importar -- caminho/do/catalogo.html
 *
 * Quando usar: depois de editar o catálogo no editor (editor/index.html)
 * e baixar o arquivo atualizado. Este script lê esse arquivo e atualiza
 * a pasta src/ para o código-fonte continuar sendo a versão oficial:
 *
 *   const CONFIG = {...}             -> src/dados/config.json
 *   const LOGO_CHAVEIRO = "data:..." -> src/imagens/logo.png
 *   const CATEGORIAS = [...]         -> src/dados/categorias.json
 *   const TAMANHOS_CUSTOM = {...}    -> src/dados/tamanhos-grupos.json
 *   const IMAGENS_OCULTAS = {...}    -> src/dados/fotos-ocultas.json
 *   const IMAGENS_XXX = {...}        -> src/imagens/<pasta>/<foto>.png|jpg
 *                                       + src/imagens/indice.json
 *
 * Só toca em src/dados e src/imagens. O código (CSS e JS) não é alterado.
 * Fotos que saíram do catálogo têm o arquivo apagado; fotos iguais às que
 * já existem não são regravadas (o Git só mostra o que mudou de verdade).
 * =====================================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Declaracoes = require('../editor/js/declaracoes.js');
const P = require('./lib/projeto.js');

/**
 * Importa o catálogo do arquivo informado para src/.
 * @param {string} arquivoHtml caminho do catálogo .html
 * @param {{silencioso?: boolean}} [opcoes]
 * @returns {{categorias:number, produtos:number, novas:number, alteradas:number, removidas:number}}
 */
function importar(arquivoHtml, opcoes) {
    opcoes = opcoes || {};
    const log = opcoes.silencioso ? () => {} : console.log;
    const texto = fs.readFileSync(arquivoHtml, 'utf8');

    /* ---------- 1. Dados ---------- */
    const categorias = Declaracoes.ler(texto, 'CATEGORIAS');
    if (!Array.isArray(categorias)) {
        throw new Error('Não encontrei "const CATEGORIAS = [...]" em ' + arquivoHtml + '. É mesmo um arquivo do catálogo?');
    }
    P.gravarJson(path.join(P.CAMINHOS.dados, 'categorias.json'), categorias);

    const config = Declaracoes.ler(texto, 'CONFIG');
    if (config) P.gravarJson(path.join(P.CAMINHOS.dados, 'config.json'), config);

    P.gravarJson(path.join(P.CAMINHOS.dados, 'tamanhos-grupos.json'), Declaracoes.ler(texto, 'TAMANHOS_CUSTOM') || {});
    P.gravarJson(path.join(P.CAMINHOS.dados, 'fotos-ocultas.json'), Declaracoes.ler(texto, 'IMAGENS_OCULTAS') || {});

    /* ---------- 2. Fotos ---------- */
    const indiceAntigo = P.lerJson(P.CAMINHOS.indiceImagens, { logo: null, mapas: {} });
    const indice = { logo: null, mapas: {} };
    const contagem = { novas: 0, alteradas: 0, removidas: 0 };

    /** Grava a foto só se ela for nova ou diferente da que já está no disco. */
    const gravarFoto = (relativo, bytes) => {
        const destino = path.join(P.CAMINHOS.imagens, relativo);
        if (fs.existsSync(destino)) {
            if (Buffer.compare(fs.readFileSync(destino), bytes) === 0) return;
            contagem.alteradas++;
        } else {
            contagem.novas++;
        }
        fs.mkdirSync(path.dirname(destino), { recursive: true });
        fs.writeFileSync(destino, bytes);
    };

    // Logo (é uma string, não um objeto, por isso é lido à parte)
    const logo = /const LOGO_CHAVEIRO = "([^"]*)";/.exec(texto);
    if (logo) {
        const foto = P.lerDataUrl(logo[1]);
        indice.logo = 'logo' + foto.extensao;
        gravarFoto(indice.logo, foto.bytes);
    }

    // Mapas: os conhecidos na ordem da tabela, depois qualquer outro que apareça
    const encontrados = Declaracoes.nomesDosMapasDeImagens(texto).filter(n => n !== 'IMAGENS_OCULTAS');
    const ordem = P.MAPAS.map(m => m.nome).filter(n => encontrados.includes(n) || n === 'IMAGENS_CUSTOM')
        .concat(encontrados.filter(n => !P.MAPAS.some(m => m.nome === n)));

    ordem.forEach(nome => {
        const info = P.infoDoMapa(nome);
        const fotos = Declaracoes.ler(texto, nome) || {};
        const antigos = (indiceAntigo.mapas[nome] && indiceAntigo.mapas[nome].fotos) || {};
        const usados = new Set();
        const entrada = { pasta: info.pasta, descricao: info.descricao, fotos: {} };

        Object.keys(fotos).forEach(chave => {
            const foto = P.lerDataUrl(fotos[chave]);
            // Mantém o nome de arquivo que a foto já tinha (se a extensão não mudou)
            let relativo = antigos[chave];
            if (!relativo || path.extname(relativo) !== foto.extensao) {
                const base = P.slug(chave);
                relativo = info.pasta + '/' + base + foto.extensao;
                for (let n = 2; usados.has(relativo); n++) relativo = info.pasta + '/' + base + '-' + n + foto.extensao;
            }
            usados.add(relativo);
            entrada.fotos[chave] = relativo;
            gravarFoto(relativo, foto.bytes);
        });

        // Apaga os arquivos de fotos que existiam neste mapa e saíram do catálogo
        Object.keys(antigos).forEach(chave => {
            const relativo = antigos[chave];
            if (!usados.has(relativo) && fs.existsSync(path.join(P.CAMINHOS.imagens, relativo))) {
                fs.unlinkSync(path.join(P.CAMINHOS.imagens, relativo));
                contagem.removidas++;
            }
        });

        indice.mapas[nome] = entrada;
    });

    P.gravarJson(P.CAMINHOS.indiceImagens, indice);

    /* ---------- 3. Resumo ---------- */
    const produtos = categorias.reduce((s, c) => s + (c.produtos || []).length, 0);
    log('Importado: ' + path.basename(arquivoHtml));
    log('  ' + categorias.length + ' categorias, ' + produtos + ' produtos');
    log('  fotos: ' + contagem.novas + ' novas, ' + contagem.alteradas + ' alteradas, ' + contagem.removidas + ' removidas');
    log('Próximo passo: npm run build (gera dist/ a partir de src/)');
    return Object.assign({ categorias: categorias.length, produtos }, contagem);
}

module.exports = { importar };

// Execução pela linha de comando
if (require.main === module) {
    const arquivo = process.argv[2];
    if (!arquivo) {
        console.error('Uso: node ferramentas/importar.js caminho/do/catalogo.html');
        process.exit(1);
    }
    try {
        importar(path.resolve(arquivo));
    } catch (e) {
        console.error('Erro: ' + e.message);
        process.exit(1);
    }
}
