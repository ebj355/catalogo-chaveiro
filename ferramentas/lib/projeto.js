/**
 * =====================================================================
 * FERRAMENTAS/LIB/PROJETO.JS - CAMINHOS, FOTOS E DADOS DO PROJETO
 * =====================================================================
 *
 * Funções usadas pelo build (src -> dist) e pela importação (html -> src):
 *   - caminhos das pastas do projeto
 *   - tabela "mapa de fotos" <-> "pasta de imagens"
 *   - conversão de foto em arquivo <-> foto em base64 (data URL)
 *   - leitura e gravação dos arquivos JSON de dados
 *
 * Só usa módulos nativos do Node.js (nenhuma dependência para instalar).
 * =====================================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* ---------------------------------------------------------------------
   CAMINHOS
   --------------------------------------------------------------------- */
const RAIZ = path.resolve(__dirname, '..', '..');
const CAMINHOS = {
    raiz: RAIZ,
    src: path.join(RAIZ, 'src'),
    dados: path.join(RAIZ, 'src', 'dados'),
    imagens: path.join(RAIZ, 'src', 'imagens'),
    indiceImagens: path.join(RAIZ, 'src', 'imagens', 'indice.json'),
    dist: path.join(RAIZ, 'dist'),
    editor: path.join(RAIZ, 'editor')
};

/* ---------------------------------------------------------------------
   MAPAS DE FOTOS
   Cada "const IMAGENS_XXX = {...}" do catálogo vira uma pasta em
   src/imagens/. A ordem abaixo é a ordem em que os mapas são escritos
   no catálogo gerado (a mesma do arquivo original).
   --------------------------------------------------------------------- */
const MAPAS = [
    { nome: 'IMAGENS_CHAVEIRINHO', pasta: 'chaveirinhos',       descricao: 'Chaveirinhos (campo "foto")' },
    { nome: 'IMAGENS_CHAVE',       pasta: 'chaves',             descricao: 'Cópia de chaves (campo "tipo")' },
    { nome: 'IMAGENS_CONTROLE',    pasta: 'controles',          descricao: 'Controles de portão' },
    { nome: 'IMAGENS_FECHADURA',   pasta: 'fechaduras',         descricao: 'Fechaduras: uma foto por GRUPO (chave = nome do grupo)' },
    { nome: 'IMAGENS_CADEADO',     pasta: 'cadeados',           descricao: 'Cadeados' },
    { nome: 'IMAGENS_MIOLO',       pasta: 'miolos',             descricao: 'Miolos' },
    { nome: 'IMAGENS_GAVETA',      pasta: 'miolos-gaveta',      descricao: 'Miolos de gaveta' },
    { nome: 'IMAGENS_MIOLO_GRANDE', pasta: 'miolos-grandes',    descricao: 'Miolos grandes' },
    { nome: 'IMAGENS_MIOLO_TETRA', pasta: 'miolos-tetra',       descricao: 'Miolos tetra' },
    { nome: 'IMAGENS_BATERIA',     pasta: 'baterias',           descricao: 'Baterias' },
    { nome: 'IMAGENS_CODIFICADAS', pasta: 'chaves-codificadas', descricao: 'Chaves codificadas' },
    { nome: 'IMAGENS_ABERTURAS',   pasta: 'aberturas',          descricao: 'Aberturas' },
    { nome: 'IMAGENS_CUSTOM',      pasta: 'custom',             descricao: 'Fotos adicionadas ou trocadas pelo editor (têm prioridade)' }
];

/** Configuração de um mapa pelo nome; mapas desconhecidos ganham uma pasta automática. */
function infoDoMapa(nome) {
    return MAPAS.find(m => m.nome === nome) || {
        nome: nome,
        pasta: nome.replace(/^IMAGENS_/, '').toLowerCase().replace(/_/g, '-'),
        descricao: 'Mapa encontrado no catálogo importado'
    };
}

/* ---------------------------------------------------------------------
   FOTOS: data URL <-> arquivo
   --------------------------------------------------------------------- */
const EXTENSAO_POR_TIPO = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg' };
const TIPO_POR_EXTENSAO = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };

/**
 * Separa uma foto "data:image/png;base64,AAAA" em tipo e bytes.
 * @param {string} dataUrl
 * @returns {{tipo:string, extensao:string, bytes:Buffer}}
 */
function lerDataUrl(dataUrl) {
    const m = /^data:([^;,]+);base64,(.*)$/s.exec(dataUrl || '');
    if (!m) throw new Error('Foto em formato inesperado (esperado data:...;base64,...): ' + String(dataUrl).slice(0, 40));
    const tipo = m[1];
    return { tipo, extensao: EXTENSAO_POR_TIPO[tipo] || '.bin', bytes: Buffer.from(m[2], 'base64') };
}

/**
 * Lê um arquivo de imagem e devolve como data URL (o formato usado dentro do catálogo).
 * @param {string} arquivo caminho absoluto
 * @returns {string}
 */
function arquivoParaDataUrl(arquivo) {
    const tipo = TIPO_POR_EXTENSAO[path.extname(arquivo).toLowerCase()];
    if (!tipo) throw new Error('Extensão de imagem não suportada: ' + arquivo);
    return 'data:' + tipo + ';base64,' + fs.readFileSync(arquivo).toString('base64');
}

/**
 * Nome de arquivo seguro a partir da chave da foto
 * ("Fechadura Yale Caixa de 45 e 55mm" -> "fechadura-yale-caixa-de-45-e-55mm").
 */
function slug(texto) {
    return String(texto || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'foto';
}

/* ---------------------------------------------------------------------
   ARQUIVOS JSON E PASTAS
   --------------------------------------------------------------------- */
function lerJson(arquivo, padrao) {
    if (!fs.existsSync(arquivo)) return padrao;
    return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
}

/** Grava JSON com 2 espaços e quebra de linha no final (fica bonito no Git). */
function gravarJson(arquivo, valor) {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.writeFileSync(arquivo, JSON.stringify(valor, null, 2) + '\n', 'utf8');
}

/** Lê um arquivo de texto do projeto (caminho relativo à raiz). */
function lerTexto(relativo) {
    return fs.readFileSync(path.join(RAIZ, relativo), 'utf8');
}

module.exports = {
    CAMINHOS,
    MAPAS,
    infoDoMapa,
    lerDataUrl,
    arquivoParaDataUrl,
    slug,
    lerJson,
    gravarJson,
    lerTexto
};
