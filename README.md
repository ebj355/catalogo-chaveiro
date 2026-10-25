# Catálogo Digital — Chaveiro Senador

Catálogo de produtos em forma de **livro de páginas** (capa, índice e uma página por categoria), mais o **editor** usado para mudar produtos, preços e fotos sem mexer em código.

O resultado final é **um único arquivo `.html`**. Ele funciona offline, abre no celular e no computador, pode ser enviado por WhatsApp ou e-mail e imprime em A4.

| | |
| --- | --- |
| Catálogo pronto | [`dist/catalogo-chaveiro-senador.html`](dist/catalogo-chaveiro-senador.html) |
| Editor pronto (arquivo único) | [`dist/editor-catalogo.html`](dist/editor-catalogo.html) |
| Conteúdo | 9 categorias, 175 produtos, 82 fotos + logo |

---

## Como funciona

```
 src/  (código-fonte, legível)          ferramentas/build.js            dist/
 ├─ catalogo.html  (esqueleto)   ──┐                               ┌─► catalogo-chaveiro-senador.html
 ├─ css/           (visual)        ├──► junta tudo em 1 arquivo ───┤   (1 arquivo, fotos em base64)
 ├─ js/            (comportamento) │                               └─► editor-catalogo.html
 ├─ dados/         (produtos)      │
 └─ imagens/       (fotos .png/.jpg)┘
                                                     ▲
     editor/ ──► você edita e baixa um .html novo ───┘ npm run importar -- arquivo.html
                                                        (traz as mudanças de volta para src/)
```

- **`src/` é a versão oficial.** Lá cada coisa está separada e comentada: as fotos são arquivos de imagem de verdade, os produtos estão num JSON, e o CSS e o JS estão divididos por assunto.
- **O build** cola tudo dentro de um único `.html`, no mesmo formato do catálogo original. É esse arquivo que o editor sabe abrir.
- **O editor** abre esse `.html`, permite editar e baixa um `.html` novo.
- **A importação** lê o `.html` baixado e atualiza `src/`, para o Git registrar exatamente o que mudou.

## Uso rápido

**Só quero ver ou mandar o catálogo:** abra `dist/catalogo-chaveiro-senador.html` no navegador.

**Quero mudar preços, produtos ou fotos:**

1. Abra `editor/index.html` (ou `dist/editor-catalogo.html`) no navegador.
2. **Carregar catálogo** → escolha `dist/catalogo-chaveiro-senador.html`.
3. Edite e clique em **Baixar catálogo atualizado**.
4. O arquivo baixado já é o catálogo novo e pode ser enviado. Para registrar a mudança no projeto:

```bash
npm run importar -- "C:\Users\voce\Downloads\catalogo-chaveiro-senador-2026-10-25.html"
npm run build
git add -A && git commit -m "Atualiza preços de fechaduras"
```

O passo a passo completo, com imagens das telas, está em [docs/COMO-USAR.md](docs/COMO-USAR.md).

## Comandos

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo. O build e a importação não usam nenhuma dependência.

| Comando | O que faz |
| --- | --- |
| `npm run build` | Gera `dist/` a partir de `src/` e `editor/` |
| `npm run importar -- arquivo.html` | Traz um catálogo `.html` (baixado do editor) de volta para `src/` |
| `npm test` | 16 testes sem navegador: leitura dos dados, build fiel a `src/`, ida e volta sem perdas |
| `npm run test:e2e` | 32 testes no navegador: catálogo, editor, exportação e importação (veja abaixo) |

Para os testes no navegador, rode uma vez `npm install` e `npx playwright install chromium`. Para testar também um catálogo no formato antigo, defina `CATALOGO_ANTIGO=caminho/do/arquivo.html`.

## Estrutura

```
catalogo/
├── src/                              CÓDIGO-FONTE DO CATÁLOGO
│   ├── catalogo.html                 Esqueleto da página (o build preenche estilos e scripts)
│   ├── css/
│   │   ├── catalogo.css              Visual: 16 seções numeradas (capa, páginas, produtos, impressão A4...)
│   │   └── ajustes-fotos.css         Tamanho e enquadramento de cada foto específica
│   ├── js/                           (o build junta nesta ordem, num único <script>)
│   │   ├── fotos.js                  Qual foto aparece em cada produto (regras e prioridades)
│   │   ├── paginas.js                Monta o HTML da capa, do índice e das categorias
│   │   ├── livro.js                  Empilha as páginas e vira as folhas (setas, teclado, arrastar)
│   │   └── menu.js                   Painel "Ir para" e inicialização final
│   ├── dados/
│   │   ├── categorias.json           Categorias e produtos (formato em docs/ESTRUTURA-DADOS.md)
│   │   ├── config.json               Nome e subtítulo da loja (capa)
│   │   ├── tamanhos-grupos.json      Tamanho da foto de grupos de fechadura (escolhido no editor)
│   │   └── fotos-ocultas.json        Fotos removidas no editor
│   └── imagens/
│       ├── indice.json               Qual arquivo é qual foto (chave da foto → arquivo)
│       ├── logo.png
│       ├── chaves/ cadeados/ fechaduras/ miolos/ ...   uma pasta por mapa de fotos
│       └── custom/                   Fotos adicionadas pelo editor
│
├── editor/                           EDITOR DO CATÁLOGO (roda no navegador, sem servidor)
│   ├── index.html
│   ├── css/editor.css
│   └── js/                           declaracoes, estado, util, fotos, carregar,
│                                     render-produtos, render-fechaduras, render-categorias,
│                                     exportar, app (cada arquivo explica o seu papel no topo)
│
├── ferramentas/
│   ├── build.js                      src/ + editor/ → dist/
│   ├── importar.js                   catálogo .html → src/
│   └── lib/projeto.js                Caminhos, pastas de fotos, base64 ↔ arquivo
│
├── dist/                             ARQUIVOS PRONTOS (gerados; não edite à mão)
├── testes/                           unitarios.js e e2e.js
└── docs/                             COMO-USAR, ESTRUTURA-DADOS, MUDANCAS
```

O arquivo `editor/js/declaracoes.js` é usado tanto pelo editor, no navegador, quanto pelas ferramentas, no Node. Assim o editor e o build leem e gravam os dados exatamente do mesmo jeito.

## Regras de foto

Para cada produto, o catálogo (`src/js/fotos.js`) e a pré-visualização do editor (`editor/js/fotos.js`) seguem a mesma ordem:

1. Produto marcado como **sem foto** (`semFoto`) → mostra o ícone da categoria.
2. **Foto do grupo** trocada no editor (`fotoModo: "grupo"`).
3. **Foto individual** adicionada ou trocada no editor.
4. **Foto original** da categoria. Cada categoria só procura nos seus próprios mapas, porque `"yale"` é uma chave e um cadeado ao mesmo tempo.
5. Nenhuma das anteriores → ícone da categoria.

Nas **fechaduras**, cada grupo (modelo) tem uma foto compartilhada, e cada item pode ter também uma foto própria pequena.

## O que os testes garantem

- O catálogo gerado é **idêntico ao original** recebido: os mesmos dados byte a byte, as 82 fotos e o logo. A comparação no navegador, página a página, de textos, fotos, tamanhos e navegação deu **0 diferenças**.
- Editar no editor (preço, foto individual, remover foto, foto e tamanho de grupo, foto de item, categoria nova) e baixar gera um catálogo que mostra tudo isso, **sem injetar código**: só os dados mudam.
- Um catálogo no **formato antigo** continua funcionando no editor e recebe o código que faltava ao exportar.
- **Ida e volta**: importar o catálogo baixado e rodar o build reproduz exatamente os mesmos dados.

## Histórico

O primeiro commit deste repositório guarda os dois arquivos como foram recebidos (`originais/`). O segundo traz o projeto organizado. O que mudou e os problemas corrigidos estão em [docs/MUDANCAS.md](docs/MUDANCAS.md). O mais importante: **o editor recebido não abria nenhum catálogo** (erro `fields is not defined`).
