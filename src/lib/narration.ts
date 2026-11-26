/**
 * Narração gravada (voz "Angel", ElevenLabs) para o botão "Ouvir esta tela".
 * Os textos são fixos e não citam o município nem o ano: o que muda de pessoa para pessoa
 * continua sendo lido pela voz do próprio aparelho, depois da gravação.
 * Para regravar, gere um MP3 por chave com o mesmo texto e salve em public/vozes/<chave>.mp3.
 */
export const NARRATION = {
  inicio: 'Olá, que bom ter você aqui. Esta é uma viagem curta entre o que você lembra e o que os satélites registraram na Amazônia. Você vai lembrar quanta floresta havia no lugar onde cresceu, e depois comparar a sua lembrança com os mapas do MapBiomas, que acompanham cada pedaço da Amazônia desde 1985. Esta página faz parte de uma pesquisa sobre como cada geração lembra a floresta. Se você concordar, guardamos seu município, seu ano de nascimento e seus chutes. Não pedimos nome, e-mail ou telefone, e as respostas só aparecem somadas. Participar é voluntário e só vale para maiores de dezoito anos. Se quiser participar, marque a caixa de concordância e toque em Começar. Se preferir, dá para ver só os dados, sem participar.',
  municipio: 'Em que município da Amazônia você morava quando tinha dez anos? Escreva o nome na caixa de busca e escolha na lista. Se você se mudou muito, escolha o lugar de que mais se lembra daquela época.',
  explorar: 'Qual município da Amazônia você quer explorar? Escreva o nome na caixa de busca e escolha na lista. Pode ser qualquer município, de qualquer um dos nove estados da Amazônia.',
  nascimento: 'Em que ano você nasceu? Escolha o ano na lista e toque em Continuar. É com ele que a gente descobre como era o seu lugar quando você era criança.',
  lembrancas: 'Antes do chute, volte no tempo. Lembre do caminho de casa até a escola, ou do lugar onde você brincava. O que tinha nele? Um igarapé, uma árvore grande, bichos, roça? Toque em tudo que vier à memória. Essas lembranças não são gravadas: elas só aparecem de novo para você, no final.',
  chute: 'Agora, feche os olhos por um instante e lembre desse lugar, no ano que aparece na tela. De cada cem pedaços de terra do município, quantos você acha que eram floresta? Vale mata de terra firme, de várzea e mangue. Não vale pasto, roça, cidade nem campo natural. Arraste a barra e veja a paisagem mudar, até ficar parecida com a sua lembrança. Não tem resposta errada: a gente quer saber o que você lembra.',
  hoje: 'E hoje? Quanto do município você acha que ainda é floresta? Esta pergunta é opcional. Se preferir, toque em Pular.',
  futuro: 'Agora pense numa criança que nasce hoje nesse lugar. Quando ela tiver dez anos, quanto do município você gostaria que ainda fosse floresta? Não é uma previsão: é o que você acha que deveria ficar para ela. Esta pergunta também é opcional.',
  moradia: 'Você ainda mora nesse município? Escolha uma das opções, ou toque em Pular.',
  revelacao: 'Chegou a hora de comparar. De um lado, a sua lembrança. Do outro, o que o satélite mediu. Escute agora os números do seu município.',
} as const;

export type NarrationKey = keyof typeof NARRATION;
