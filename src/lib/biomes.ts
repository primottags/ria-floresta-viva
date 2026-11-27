/**
 * Os seis biomas. A pessoa escolhe o bioma na tela inicial e a página muda de "tema":
 * o título, a palavra do chute e o que vale ou não vale.
 * Amazônia e Mata Atlântica medem floresta; nos outros, o natural também é savana,
 * caatinga e campo, então medimos a vegetação nativa (ver pesquisa/dados/LEIA-ME.md).
 */
export type BiomeSlug = 'amazonia' | 'mata-atlantica' | 'cerrado' | 'caatinga' | 'pampa' | 'pantanal';

export type Biome = {
  slug: BiomeSlug;
  /** Nome do bioma: "Amazônia". */
  name: string;
  /** "na Amazônia", "no Cerrado". */
  inName: string;
  /** "da Amazônia", "do Cerrado". */
  ofName: string;
  /** Título da página, em duas linhas para a marca. */
  title: [string, string];
  /** O que se mede, como aparece nas frases: "floresta", "cerrado nativo". */
  noun: string;
  /** Rótulo curto da legenda: "floresta", "vegetação nativa". */
  legend: string;
  /** Pergunta de abertura. */
  hook: string;
  /** O que vale e o que não vale no chute. */
  help: string;
  /** Uma linha de cartão na escolha do bioma. */
  card: string;
  indicator: 'floresta' | 'vegetacao_nativa';
};

export const BIOMES: Biome[] = [
  { slug: 'amazonia', name: 'Amazônia', inName: 'na Amazônia', ofName: 'da Amazônia', title: ['A floresta da', 'sua infância'], noun: 'floresta', legend: 'floresta', hook: 'Quanta floresta você viu crescendo?', help: 'Vale mata de terra firme, de várzea e mangue. Não vale pasto, roça, cidade nem campo natural.', card: 'Mata de terra firme, várzea, igapó', indicator: 'floresta' },
  { slug: 'mata-atlantica', name: 'Mata Atlântica', inName: 'na Mata Atlântica', ofName: 'da Mata Atlântica', title: ['A mata da', 'sua infância'], noun: 'mata', legend: 'mata nativa', hook: 'Quanta mata você viu crescendo?', help: 'Vale mata nativa, restinga com árvores e mangue. Não vale eucalipto, pinus, pasto, roça nem cidade.', card: 'Mata, restinga, mangue, araucária', indicator: 'floresta' },
  { slug: 'cerrado', name: 'Cerrado', inName: 'no Cerrado', ofName: 'do Cerrado', title: ['O cerrado da', 'sua infância'], noun: 'cerrado nativo', legend: 'cerrado nativo', hook: 'Quanto cerrado você viu crescendo?', help: 'Vale cerrado, cerradão, campo nativo, vereda e mata de beira de rio. Não vale pasto plantado, soja, eucalipto nem cidade.', card: 'Cerrado, cerradão, campo, vereda', indicator: 'vegetacao_nativa' },
  { slug: 'caatinga', name: 'Caatinga', inName: 'na Caatinga', ofName: 'da Caatinga', title: ['A caatinga da', 'sua infância'], noun: 'caatinga nativa', legend: 'caatinga nativa', hook: 'Quanta caatinga você viu crescendo?', help: 'Vale caatinga nativa, mata seca e arbustos. Não vale pasto, roça, palma plantada nem cidade.', card: 'Caatinga, mata seca, arbustos', indicator: 'vegetacao_nativa' },
  { slug: 'pampa', name: 'Pampa', inName: 'no Pampa', ofName: 'do Pampa', title: ['O campo da', 'sua infância'], noun: 'campo nativo', legend: 'campo e mato nativos', hook: 'Quanto campo nativo você viu crescendo?', help: 'Vale campo nativo (mesmo com gado), banhado e mato. Não vale lavoura, arroz, pinus, eucalipto nem cidade.', card: 'Campo nativo, banhado, capão de mato', indicator: 'vegetacao_nativa' },
  { slug: 'pantanal', name: 'Pantanal', inName: 'no Pantanal', ofName: 'do Pantanal', title: ['O pantanal da', 'sua infância'], noun: 'vegetação nativa', legend: 'vegetação nativa', hook: 'Quanto pantanal você viu crescendo?', help: 'Vale campo alagável, cerrado, capão e mata nativos. Não vale pasto plantado, lavoura nem cidade.', card: 'Campo alagável, capão, cordilheira', indicator: 'vegetacao_nativa' },
];

export const biomeBySlug = (slug: string | null | undefined) => BIOMES.find((b) => b.slug === slug);
export const DEFAULT_BIOME = BIOMES[0] as Biome;
