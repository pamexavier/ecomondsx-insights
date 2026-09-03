# Como colocar o microsserviço de horizonte DSM pra rodar

Guia de referência — usar quando decidirem ativar o cálculo automático de
obstrução (em vez do fallback heurístico por andar). Não é urgente, o
workflow já funciona sem isso.

## O que você precisa antes de começar

1. Uma **API key do Google Cloud** com a **Solar API** ativada e faturamento
   habilitado no projeto (mesma que já usam pra Building Insights, só
   precisa garantir que o "Data Layers" também está liberado nela).
2. Um lugar pra hospedar um programinha Node.js simples. Sugestões fáceis
   pra quem não é dev, do mais simples ao mais flexível:
   - **Railway** (railway.app) — configura em uns 10-15 min, ~US$5/mês
   - **Render** (render.com) — tem free tier (dorme se ficar sem uso, mas
     serve pra testar), depois ~US$7/mês
   - Se já tiverem servidor próprio (VPS), também funciona, só precisa ter
     Node.js instalado.
3. O arquivo `microservico-horizonte-dsm.js` (já em mãos).

## Passo a passo

### 1. Preparar o projeto

Numa pasta nova no computador (ou repositório):

```bash
mkdir horizonte-dsm-service
cd horizonte-dsm-service
# cole o arquivo microservico-horizonte-dsm.js aqui dentro
npm init -y
npm install express geotiff node-fetch@2
```

> Atenção: `node-fetch@2` (não a versão 3) porque o script usa `require`,
> e a v3 só funciona com `import`.

### 2. Testar localmente (opcional, mas recomendado)

```bash
GOOGLE_SOLAR_API_KEY=sua_chave_aqui node microservico-horizonte-dsm.js
```

Deve aparecer: `Serviço de horizonte DSM rodando na porta 3000`

Testar com um endereço real (troque lat/lng por um endereço de verdade):

```bash
curl -X POST http://localhost:3000/horizonte \
  -H "Content-Type: application/json" \
  -d '{"lat": -29.886, "lng": -50.269, "alturaJanela": 3, "azimuteFachada": 270}'
```

Se voltar `"disponivel": true` com uma lista `perfil`, funcionou. Se vier
`"disponivel": false` com um `erro`, o texto do erro diz o motivo (chave
inválida, sem cobertura da Solar API pro endereço, etc).

### 3. Subir num serviço de hospedagem (exemplo: Railway)

1. Criar conta em railway.app (dá pra logar com GitHub).
2. Subir o código pra um repositório GitHub (ou usar o CLI do Railway pra
   fazer deploy direto da pasta, sem precisar de Git).
3. No Railway: "New Project" → conectar o repositório (ou "Deploy from
   local").
4. Em **Variables**, adicionar: `GOOGLE_SOLAR_API_KEY` = sua chave.
5. O Railway detecta automaticamente que é um projeto Node e sobe sozinho.
6. Depois do deploy, o Railway te dá uma URL pública tipo
   `https://horizonte-dsm-service-production.up.railway.app`.

### 4. Conectar no n8n

1. No workflow, adicionar um node **HTTP Request** entre "3 - Organizar
   Dados" e "6 - Calculo Solar".
   - Method: POST
   - URL: `https://[sua-url-do-railway]/horizonte`
   - Body (JSON):
     ```json
     {
       "lat": "={{ $json.lat }}",
       "lng": "={{ $json.lng }}",
       "alturaJanela": "={{ $json.alturaApartamento }}",
       "azimuteFachada": "={{ ({norte:0,nordeste:45,leste:90,sudeste:135,sul:180,sudoeste:225,oeste:270,noroeste:315})[$json.fachada.toLowerCase()] }}"
     }
     ```
2. Adicionar um pequeno node **Code** logo depois, só pra repassar os
   campos anteriores + o novo `horizontePerfil`:
   ```js
   const anterior = $('3 - Organizar Dados').item.json;
   const horizonte = $input.item.json;
   return {
     ...anterior,
     horizontePerfil: horizonte.disponivel ? horizonte.perfil : null,
   };
   ```
3. Ligar esse node Code na entrada do "6 - Calculo Solar" (no lugar da
   ligação direta que existia antes com "3 - Organizar Dados").

O node 6 já está preparado pra usar `horizontePerfil` automaticamente
quando ele existir — não precisa mexer em mais nada lá.

## Como saber se está funcionando de verdade

No resultado final, o campo `sombreamento_real.metodo` deve aparecer como
`"geometria_real_dsm_auto"` (em vez de `"heuristica_tabela_andar"`), e
`sombreamento_real.confiavel` deve ser `true`.

## Custo esperado (checar preço atualizado antes de decidir, isso muda)

- Solar API "Data Layers": 1.000 chamadas grátis por mês, depois
  ~US$0,075 por chamada.
- Hospedagem do microsserviço: ~US$5-7/mês.
- Sem essa ativação, o sistema continua funcionando pelo fallback
  heurístico — isso é um upgrade, não um bloqueio.
