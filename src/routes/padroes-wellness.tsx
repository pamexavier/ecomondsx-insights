import { createFileRoute, Link } from "@tanstack/react-router";
import { InstitutionalLayout } from "@/components/InstitutionalLayout";

const DIMENSOES_WELLNESS = [
  {
    id: "ar",
    numero: "01",
    titulo: "Ar",
    resumo: "Respirar melhor começa por controlar fontes e renovar o ar.",
    detalhe:
      "A qualidade do ar interior depende de várias camadas: reduzir poluentes na origem, dimensionar a ventilação para o uso real, filtrar partículas quando necessário e manter sistemas limpos. CO₂ pode ajudar a avaliar a ventilação em espaços ocupados, mas não representa todos os poluentes e não deve ser interpretado como medição de VOCs, partículas ou risco à saúde.",
    exemplos: "Fontes de emissão · ventilação · filtragem · manutenção · monitoramento",
  },
  {
    id: "agua",
    numero: "02",
    titulo: "Água",
    resumo: "Acesso, qualidade e gestão segura da água usada no edifício.",
    detalhe:
      "Uma estratégia de água considera a qualidade adequada ao consumo e aos diferentes usos, a manutenção dos sistemas, a prevenção de contaminações e o acesso conveniente a pontos de hidratação. A segurança depende de análise, operação e manutenção — não apenas da presença de um filtro ou equipamento.",
    exemplos: "Qualidade · acesso à hidratação · operação · manutenção · uso responsável",
  },
  {
    id: "alimentacao",
    numero: "03",
    titulo: "Alimentação",
    resumo: "Ambientes que tornam escolhas alimentares equilibradas mais acessíveis.",
    detalhe:
      "O espaço pode facilitar o acesso a água potável e a opções variadas e nutritivas, além de apoiar informação clara e escolhas inclusivas. O desenho do edifício influencia oportunidades; não determina, por si só, a alimentação ou a saúde de cada pessoa.",
    exemplos: "Acesso · disponibilidade · informação · inclusão · apoio a escolhas",
  },
  {
    id: "luz",
    numero: "04",
    titulo: "Luz",
    resumo: "Luz diurna útil, conforto visual e iluminação elétrica bem planejada.",
    detalhe:
      "Uma boa estratégia combina luz natural, controle de ofuscamento, distribuição adequada da iluminação elétrica e controles compreensíveis. A luz também participa dos ritmos circadianos: horário, duração, intensidade e composição espectral importam. Não existe uma temperatura de cor única que seja ideal para todos os horários, pessoas e tarefas.",
    exemplos:
      "Luz natural · ofuscamento · níveis de iluminância · controles · exposição ao longo do dia",
  },
  {
    id: "movimento",
    numero: "05",
    titulo: "Movimento",
    resumo: "O projeto pode tornar deslocamentos ativos e acessíveis mais naturais.",
    detalhe:
      "Circulações legíveis, escadas seguras e convidativas, bicicletários, conexões com áreas externas e espaços que permitem mudar de postura podem apoiar o movimento cotidiano. A abordagem deve oferecer opções, respeitar diferentes capacidades e evitar transformar atividade física em obrigação.",
    exemplos: "Escadas · caminhabilidade · ergonomia · acessibilidade · variedade de posturas",
  },
  {
    id: "conforto-termico",
    numero: "06",
    titulo: "Conforto térmico",
    resumo: "Temperatura percebida resulta de mais fatores do que o termostato.",
    detalhe:
      "Temperatura do ar, temperatura radiante das superfícies, velocidade do ar, umidade, roupa, atividade e adaptação individual afetam a sensação térmica. Estratégias de projeto e controles acessíveis ajudam a reduzir desconforto, mas a preferência varia entre pessoas e ao longo do tempo.",
    exemplos: "Temperatura · radiação · velocidade do ar · umidade · controles individuais",
  },
  {
    id: "som",
    numero: "07",
    titulo: "Som",
    resumo: "Acústica adequada protege concentração, comunicação, descanso e privacidade.",
    detalhe:
      "Conforto acústico não é simplesmente eliminar todo som. É controlar ruídos indesejados, limitar reverberação onde a fala precisa ser compreendida, garantir privacidade entre ambientes e escolher soluções coerentes com cada atividade. Fontes externas, equipamentos e comportamento dos ocupantes também fazem parte do problema.",
    exemplos: "Ruído de fundo · reverberação · inteligibilidade · privacidade · zoneamento",
  },
  {
    id: "materiais",
    numero: "08",
    titulo: "Materiais",
    resumo: "Escolhas de materiais influenciam emissões, manutenção e impacto ambiental.",
    detalhe:
      "A seleção pode considerar emissões para o ar interior, ingredientes e informações disponíveis, durabilidade, limpeza, manutenção e impactos ao longo do ciclo de vida. Uma alegação comercial ou um material isolado não comprovam que todo o ambiente seja saudável; contexto, instalação e operação importam.",
    exemplos: "Emissões · transparência · durabilidade · manutenção · ciclo de vida",
  },
  {
    id: "mente",
    numero: "09",
    titulo: "Mente",
    resumo: "Espaços podem apoiar restauração, tranquilidade, autonomia e pertencimento.",
    detalhe:
      "Luz, ruído, privacidade, contato com a natureza, legibilidade dos espaços e disponibilidade de áreas de pausa influenciam a experiência cotidiana. O projeto pode oferecer condições mais acolhedoras e restauradoras, sem prometer tratar ou prevenir transtornos de saúde mental.",
    exemplos: "Restauração · privacidade · contato com a natureza · autonomia · acolhimento",
  },
  {
    id: "comunidade",
    numero: "10",
    titulo: "Comunidade",
    resumo: "Bem-estar também depende de inclusão, acesso e relações sociais.",
    detalhe:
      "Entradas, circulações, instalações e serviços devem ser pensados para diferentes idades e capacidades. Espaços compartilhados, orientação clara e oportunidades de encontro podem favorecer participação e conexão, desde que também existam alternativas para quem precisa de privacidade ou menor estímulo.",
    exemplos: "Acessibilidade · inclusão · orientação · encontro · participação",
  },
];

function PadroesWellnessPage() {
  return (
    <InstitutionalLayout>
      <article className="space-y-12 py-8 sm:py-12">
        <header className="max-w-4xl">
          <p className="text-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Ambientes construídos · saúde e bem-estar
          </p>
          <h1 className="mt-3 text-display text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">
            O que significa projetar para Wellness?
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Wellness no ambiente construído é uma abordagem para considerar como edifícios e espaços
            afetam a experiência cotidiana das pessoas. Ela reúne decisões de projeto, construção,
            operação e manutenção que podem apoiar saúde, conforto, autonomia e convivência — sem
            reduzir bem-estar a um selo ou a uma única tecnologia.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Isso significa olhar para o conjunto: o ar que circula, a água disponível, a luz ao
            longo do dia, o ruído, a temperatura, os materiais, as oportunidades de movimento, o
            contato com a natureza e a forma como diferentes pessoas conseguem usar e compartilhar
            os espaços.
          </p>
        </header>

        <section
          className="grid gap-3 sm:grid-cols-3"
          aria-label="Princípios da abordagem Wellness"
        >
          {[
            {
              titulo: "É multidimensional",
              texto:
                "Conforto, saúde, experiência e inclusão dependem de fatores que se relacionam.",
            },
            {
              titulo: "É uma prática contínua",
              texto:
                "O desempenho depende do projeto, da execução e da operação ao longo do tempo.",
            },
            {
              titulo: "É centrada nas pessoas",
              texto:
                "Boas soluções oferecem segurança, acesso, escolha e conforto para diferentes usuários.",
            },
          ].map((item) => (
            <div key={item.titulo} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold text-foreground">{item.titulo}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.texto}</p>
            </div>
          ))}
        </section>

        <section className="max-w-4xl space-y-4">
          <div>
            <p className="text-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Entenda antes de escolher soluções
            </p>
            <h2 className="mt-2 text-display text-2xl font-bold text-foreground sm:text-3xl">
              Wellness não é apenas decoração ou tecnologia
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Plantas, luz natural, sensores ou mobiliário ergonômico podem contribuir para um
            ambiente melhor, mas nenhum desses elementos isoladamente comprova desempenho. É preciso
            entender a necessidade, escolher critérios pertinentes, especificar soluções, executar
            corretamente e verificar se o espaço funciona como esperado.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            A certificação WELL é uma estrutura voluntária do International WELL Building Institute
            (IWBI) que organiza requisitos e estratégias relacionadas à saúde e ao bem-estar em
            espaços. A versão aplicável, os requisitos e o processo de verificação devem ser
            confirmados diretamente na documentação oficial vigente. Uma página educativa como esta
            explica conceitos; não concede certificação, não substitui consultoria especializada e
            não representa avaliação médica.
          </p>
        </section>

        <section className="max-w-4xl">
          <div className="mb-5">
            <p className="text-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Dez temas para explorar
            </p>
            <h2 className="mt-2 text-display text-2xl font-bold text-foreground sm:text-3xl">
              Como os espaços podem apoiar o bem-estar
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Abra cada tema para conhecer sua relação com o ambiente, exemplos de decisões de
              projeto e pontos que precisam de atenção. As categorias abaixo seguem os temas
              conhecidos do WELL Building Standard; critérios de certificação específicos podem
              mudar conforme a versão e o tipo de projeto.
            </p>
          </div>

          <div className="space-y-2">
            {DIMENSOES_WELLNESS.map((dimensao) => (
              <details
                key={dimensao.id}
                className="group rounded-2xl border border-border bg-card px-4 py-4 open:border-primary/30 open:bg-primary/[0.03] sm:px-5"
              >
                <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
                  <span className="mt-0.5 font-mono text-[10px] font-bold text-primary">
                    {dimensao.numero}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold text-foreground">
                      {dimensao.titulo}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                      {dimensao.resumo}
                    </span>
                  </span>
                  <span
                    className="ml-2 text-lg leading-none text-primary transition-transform group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <div className="ml-7 mt-4 border-t border-border/70 pt-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {dimensao.detalhe}
                  </p>
                  <p className="mt-3 text-xs leading-relaxed text-foreground">
                    <strong>O que observar:</strong> {dimensao.exemplos}.
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-border bg-card p-5 sm:p-7">
            <p className="text-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Luz e ritmos diários
            </p>
            <h2 className="mt-2 text-display text-xl font-bold text-foreground sm:text-2xl">
              Iluminação, ciclo circadiano e conforto visual
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                O sistema circadiano ajuda a sincronizar ritmos biológicos com sinais ambientais,
                entre eles o ciclo claro-escuro. A luz que chega aos olhos varia em intensidade,
                duração, horário e composição espectral; por isso, avaliar iluminação apenas pela
                potência da lâmpada ou pela temperatura de cor é insuficiente.
              </p>
              <p>
                Durante o dia, acesso adequado à luz natural pode apoiar orientação temporal e
                qualidade visual, desde que ofuscamento, calor excessivo e contrastes sejam
                controlados. À noite, níveis e espectros de luz podem ser ajustados às tarefas e ao
                período de uso, sem comprometer segurança ou necessidades individuais.
              </p>
              <p>
                A resposta biológica varia entre pessoas e depende também de horários, hábitos,
                saúde e exposição fora do edifício. Um projeto pode melhorar as condições de
                iluminação; não deve prometer tratar distúrbios do sono nem substituir orientação
                clínica.
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-border bg-card p-5 sm:p-7">
            <p className="text-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Natureza e experiência
            </p>
            <h2 className="mt-2 text-display text-xl font-bold text-foreground sm:text-2xl">
              Biofilia: mais do que colocar plantas
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Biofilia descreve a conexão humana com a natureza. Na arquitetura, uma abordagem
                biofílica pode incluir vista e acesso a paisagens, luz natural, ventilação,
                materiais e texturas naturais, formas inspiradas em padrões naturais e espaços de
                restauração.
              </p>
              <p>
                Plantas internas podem fazer parte da experiência, mas exigem escolha de espécies,
                iluminação, irrigação e manutenção adequadas. Elas não substituem ventilação,
                filtragem ou controle de fontes poluentes e não devem ser apresentadas como
                purificadores universais do ar.
              </p>
              <p>
                Uma estratégia responsável considera clima local, água, manutenção, alergias,
                segurança e acessibilidade — e avalia a natureza como parte de uma experiência
                espacial, não como um adereço isolado.
              </p>
            </div>
          </article>
        </section>

        <section className="max-w-4xl rounded-3xl border border-border bg-muted/30 p-5 sm:p-7">
          <p className="text-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Da intenção ao desempenho
          </p>
          <h2 className="mt-2 text-display text-2xl font-bold text-foreground">
            Como aplicar os princípios em um projeto
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              {
                titulo: "1. Entender quem usa o espaço",
                texto:
                  "Mapear atividades, horários, necessidades, sensibilidades e barreiras de acesso.",
              },
              {
                titulo: "2. Priorizar riscos e oportunidades",
                texto:
                  "Observar fontes de poluição, ruído, ofuscamento, desconforto e falta de acesso.",
              },
              {
                titulo: "3. Integrar disciplinas",
                texto:
                  "Compatibilizar arquitetura, instalações, iluminação, acústica, operação e manutenção.",
              },
              {
                titulo: "4. Verificar e manter",
                texto:
                  "Definir como soluções serão comissionadas, avaliadas e mantidas depois da entrega.",
              },
            ].map((etapa) => (
              <li key={etapa.titulo} className="rounded-2xl bg-background p-4">
                <h3 className="text-sm font-bold text-foreground">{etapa.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{etapa.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-5 rounded-3xl border border-primary/20 bg-primary/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="max-w-2xl">
            <p className="text-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Continue explorando
            </p>
            <h2 className="mt-2 text-display text-xl font-bold text-foreground sm:text-2xl">
              Conecte os conceitos a um ambiente real
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Explore como ventilação, iluminação e características do cômodo podem ser analisadas
              no espaço educativo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/educativo"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Abrir ambiente educativo
            </Link>
            <Link
              to="/referencias"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/40"
            >
              Ver certificações
            </Link>
          </div>
        </section>

        <footer className="max-w-4xl border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
          <p>
            Conteúdo educativo. Os requisitos de certificação, referências técnicas e métodos de
            verificação podem ser atualizados. Para avaliar elegibilidade ou certificar um projeto,
            consulte a documentação vigente do{" "}
            <a
              href="https://www.wellcertified.com/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary underline underline-offset-2"
            >
              International WELL Building Institute
            </a>{" "}
            e profissionais qualificados.
          </p>
        </footer>
      </article>
    </InstitutionalLayout>
  );
}

export const Route = createFileRoute("/padroes-wellness")({
  component: PadroesWellnessPage,
});
