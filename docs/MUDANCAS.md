# O que mudou em relação aos arquivos recebidos

Arquivos de origem, preservados no primeiro commit em `originais/`:

- `catalogo-chaveiro-senador-2026-08-16.html`: o catálogo, 3,1 MB em um arquivo, sendo cerca de 2,6 MB de fotos em base64 no meio do código.
- `editor-catalogo-fotos-individuais-e-grupos-CORRIGIDO.html`: o editor.

Para ver os originais: `git show <primeiro-commit>:originais/<arquivo>`, ou `git log --oneline` para achar o commit.

## Problemas corrigidos

| Problema | Onde | Correção |
| --- | --- | --- |
| **O editor não abria nenhum catálogo**. Aparecia "Não consegui ler esse arquivo como catálogo válido — fields is not defined" | `renderProductCard` usava `fields` e `fieldBlock`, que só existiam dentro de outra função | Os campos agora são criados em `editor/js/render-produtos.js`, com uma função compartilhada `campoDoProduto` (`editor/js/util.js`) |
| Foto trocada no editor para um **grupo de fechadura** aparecia no editor, mas o catálogo continuava mostrando a foto antiga | O catálogo dava prioridade a `IMAGENS_FECHADURA` e o editor a `IMAGENS_CUSTOM` | O catálogo segue a mesma regra do editor: foto do editor primeiro (`src/js/fotos.js`, `fotoDoGrupo`) |
| Foto de grupo **removida** no editor continuava aparecendo no catálogo | O catálogo ignorava `IMAGENS_OCULTAS["group:..."]` nos grupos de fechadura | Agora respeita |
| **Foto individual de item de fechadura** escolhida no editor não aparecia no catálogo | O catálogo não desenhava foto nos itens | O item mostra a foto pequena ao lado (`.lock-item__foto`) |
| Texto digitado com `<` ou `&` podia quebrar a página | Os textos iam direto para o HTML | O catálogo e o menu escapam os textos (`esc()` em `src/js/fotos.js`) |
| Ao exportar, o editor alterava trechos do código do catálogo para catálogos antigos | Correção automática feita para o formato antigo | O catálogo gerado já tem esse suporte e o editor não injeta nada. Catálogos antigos continuam sendo corrigidos na exportação |

## Organização

| Antes | Depois |
| --- | --- |
| Catálogo: 1 arquivo de 2.546 linhas, com linhas de até 825 mil caracteres (fotos) | `src/`: 1 esqueleto HTML, 2 CSS, 4 JS, 4 JSON e 82 fotos e o logo como arquivos `.png`/`.jpg`. O build gera o mesmo arquivo único |
| Editor: 1 arquivo de 1.228 linhas | `editor/`: HTML, CSS e 10 arquivos JS, um por responsabilidade, cada um explicando no topo o que faz |
| Regras de foto numa cadeia de 8 `if/else` | Tabela `FOTOS_NATIVAS` e funções curtas e comentadas (`src/js/fotos.js`) |
| Ajustes de tamanho de cada foto misturados com o resto do CSS | Separados em `src/css/ajustes-fotos.css` |
| Estilos escritos dentro do JavaScript do editor (`style.cssText = ...`) | Classes no `editor/css/editor.css` (seção 9). O editor ganhou layout para celular (seção 10) |
| Leitura das declarações (`const X = ...`) só dentro do editor | `editor/js/declaracoes.js`, usado pelo editor **e** pelas ferramentas de build/importação |
| `gerarSvgChave()`: 117 linhas de desenhos SVG de chaves | Removido. **Não era chamado em lugar nenhum**: o catálogo usa as fotos de `IMAGENS_CHAVE` e, para tipo desconhecido, a foto da Yale |

## O que **não** mudou

- O visual e o conteúdo do catálogo. A comparação automática no navegador, página por página, de textos, fotos, tamanhos de cada foto e navegação deu **0 diferenças** em relação ao original.
- O formato do arquivo final: o editor continua abrindo e salvando o catálogo do mesmo jeito, inclusive catálogos antigos.
