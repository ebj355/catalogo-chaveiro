# Estrutura dos dados

## Categoria (`src/dados/categorias.json`)

O arquivo é uma lista de categorias. A ordem da lista é a ordem das páginas no catálogo.

```json
{
  "id": "cadeados",
  "nome": "Cadeados",
  "icone": "🔒",
  "descricao": "Cadeados de várias marcas e tamanhos.",
  "produtos": [ ... ]
}
```

| Campo | Para que serve |
| --- | --- |
| `id` | Identificador interno. **Define de onde vêm as fotos originais e o layout** (tabela abaixo). Categorias novas recebem o nome sem acentos (ex.: `promocoes`) |
| `nome` | Título da página, do índice e do menu |
| `icone` | Emoji do rótulo da página. Também aparece no lugar da foto quando o produto não tem foto |
| `descricao` | Frase abaixo do título da página |
| `produtos` | Lista de produtos (abaixo) |

### IDs especiais

| `id` | Layout | Fotos originais (campo do produto → mapa) |
| --- | --- | --- |
| `copia-chaves` | cartões | `tipo` → `IMAGENS_CHAVE` (`src/imagens/chaves/`). Tipo desconhecido usa a foto da Yale |
| `chaveirinho` | cartões | `foto` → `IMAGENS_CHAVEIRINHO` |
| `controle-portao` | cartões | `foto` → `IMAGENS_CONTROLE` (foto inteira, sem cortar) |
| `bateria` | cartões | `foto` → `IMAGENS_BATERIA` |
| `cadeados` | cartões | `foto` → `IMAGENS_CADEADO` |
| `miolos` | cartões | `foto` → `IMAGENS_MIOLO`, `IMAGENS_GAVETA`, `IMAGENS_MIOLO_GRANDE`, `IMAGENS_MIOLO_TETRA` (nessa ordem) |
| `aberturas` | cartões | `foto` → `IMAGENS_ABERTURAS` |
| `chaves-codificadas` | cartões | `foto` → `IMAGENS_CODIFICADAS` |
| `fechaduras` | **grupos**: uma foto por modelo e itens em lista | nome do `grupo` → `IMAGENS_FECHADURA` |
| outro qualquer | cartões | Só fotos adicionadas pelo editor (`IMAGENS_CUSTOM`) |

Essa tabela existe em dois lugares, que precisam bater: `FOTOS_NATIVAS` em `src/js/fotos.js` (catálogo) e `MAPAS_POR_CATEGORIA` em `editor/js/estado.js` (pré-visualização do editor).

## Produto

```json
{ "nome": "Cadeado Yale 30mm", "preco": "R$ 25,00", "condicao": "Balcão",
  "desc": "Latão maciço.", "grupo": "Cadeado Yale", "foto": "yale" }
```

| Campo | Obrigatório | Para que serve |
| --- | --- | --- |
| `nome` | sim | Nome do produto |
| `preco` | sim | Texto livre (ex.: `"R$ 25,00"`, `"Sob consulta"`) |
| `desc` | não | Descrição curta abaixo do nome |
| `condicao` | não | Etiqueta azul ao lado do preço (ex.: `"Balcão"`, `"Com corte"`) |
| `grupo` | não | Produtos **seguidos** com o mesmo grupo ficam juntos sob esse título. Em `fechaduras`, cada grupo é um modelo com foto própria |
| `tipo` | só em `copia-chaves` | Chave da foto em `IMAGENS_CHAVE` (`yale`, `tetra`, `aco`, `gorge`, `multiponto`...) |
| `foto` | não | Chave da foto no mapa da categoria ou em `IMAGENS_CUSTOM` |
| `fotoModo` | não (editor) | `"grupo"`: usa a foto do grupo. `"individual"`: foto própria (padrão) |
| `semFoto` | não (editor) | `true`: o produto não mostra foto (aparece o ícone) |

Os campos marcados com "(editor)" são criados pelo editor. Não é preciso escrevê-los à mão.

## Fotos (`src/imagens/indice.json`)

```json
{
  "logo": "logo.png",
  "mapas": {
    "IMAGENS_CADEADO": {
      "pasta": "cadeados",
      "descricao": "Cadeados",
      "fotos": { "yale": "cadeados/yale.jpg", "tetra": "cadeados/tetra.png" }
    }
  }
}
```

- Cada **mapa** vira, no catálogo final, um `const IMAGENS_CADEADO = { "yale": "data:image/jpeg;base64,..." }`.
- A **chave** (`"yale"`) é o valor usado no campo `foto` do produto, ou o nome do grupo em `IMAGENS_FECHADURA`.
- O **arquivo** pode ser `.png`, `.jpg`, `.webp`, `.gif` ou `.svg`.
- Para **trocar uma foto original**, substitua o arquivo mantendo o nome. Para **acrescentar** uma foto a um mapa, coloque o arquivo na pasta, adicione a linha em `fotos` e use a chave no produto.

## Ajustes gravados pelo editor

| Arquivo | Conteúdo | Exemplo |
| --- | --- | --- |
| `src/dados/tamanhos-grupos.json` | Largura (px) da foto de cada grupo de fechadura | `{ "Fechadura Gorge": 150 }` |
| `src/dados/fotos-ocultas.json` | Fotos removidas: a chave da foto, ou `group:<nome>` para foto de grupo | `{ "yale": true, "group:Ferolho": true }` |
| `src/imagens/custom/` | Fotos novas ou trocadas (`IMAGENS_CUSTOM`): chave única por produto ou o nome do grupo | `custom_lx3k9a_4fj2c.png` |

## Formato dentro do catálogo final

O editor e as ferramentas leem e gravam estas declarações dentro do `<script>` do `.html`. **Os nomes não podem mudar**:

```js
const CONFIG = {...};             const LOGO_CHAVEIRO = "data:...";
const IMAGENS_XXX = {...};        // um por mapa
const IMAGENS_CUSTOM = {...};     const IMAGENS_OCULTAS = {...};
const TAMANHOS_CUSTOM = {...};    const CATEGORIAS = [...];
```
