import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Sprout } from 'lucide-react';
import { MemoryPanel } from '@/components/forest/MemoryPanel';

export const Route = createFileRoute('/painel')({
  head: () => ({ meta: [
    { title: 'O que a Amazônia lembra · A floresta da sua infância' },
    { name: 'description', content: 'Como cada geração lembra a floresta da Amazônia, comparado com os dados do MapBiomas.' },
    { property: 'og:title', content: 'O que a Amazônia lembra' },
    { property: 'og:description', content: 'Cada geração lembra uma floresta diferente. Veja a diferença entre a memória e o satélite.' },
  ] }),
  component: Painel,
});

function Painel() {
  return <div className="app-shell"><main className="question-page panel-page">
    <div className="question-top"><Link to="/" className="brand-mark"><Sprout aria-hidden="true" /> A floresta da sua infância</Link><span className="step-count">Painel público</span></div>
    <p className="eyebrow">Memória coletiva x satélite</p>
    <h1>O que a Amazônia lembra</h1>
    <p className="reveal-sentence">Cada pessoa contou quanta floresta lembra de ter visto aos 10 anos no seu município. Aqui juntamos essas lembranças e comparamos com o que os satélites registraram.</p>
    <MemoryPanel />
    <div className="action-stack"><Link to="/" className="panel-cta">Fazer o meu chute <ArrowRight aria-hidden="true" /></Link></div>
  </main></div>;
}
