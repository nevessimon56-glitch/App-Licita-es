# App Licitações

Aplicação web para análise executiva detalhada de editais de licitação pública, Termos de Referência e anexos técnicos, conforme a **Lei nº 14.133/2021**.

O sistema extrai o texto dos PDFs enviados e gera um resumo estruturado em **18 tópicos**, citando página, item ou cláusula de origem — **sem suposições** e apenas com base no conteúdo dos documentos.

## Funcionalidades

- Upload de múltiplos PDFs (Edital, Termo de Referência, anexos)
- Classificação automática do tipo de documento (editável)
- Análise completa em 18 seções:
  1. Resumo Geral
  2. Equipamentos
  3. Entrega
  4. Instalação
  5. Pagamento
  6. Garantia
  7. Assistência Técnica
  8. Documentação exigida
  9. Proposta Comercial
  10. Penalidades
  11. Obrigações da Contratada
  12. Obrigações da Contratante
  13. Prazos Importantes
  14. Valores
  15. Pontos de Atenção
  16. Riscos para o fornecedor
  17. Checklist para participação
  18. Conclusão
- Exportação do resultado em **PDF**, **Word (.docx)** e Markdown
- Interface responsiva e profissional (sem login)

## Requisitos

- Node.js 18+
- Chave de API do **Google Gemini**

## Instalação

```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd app-licitacoes

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local e adicione sua GEMINI_API_KEY
```

## Configuração

Crie o arquivo `.env.local` na raiz do projeto:

```env
GEMINI_API_KEY=AIza-sua-chave-aqui
GEMINI_MODEL=gemini-2.5-flash
```

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `GEMINI_API_KEY` | Sim | Chave da API Gemini ([obter aqui](https://aistudio.google.com/apikey)) |
| `GEMINI_MODEL` | Não | Modelo usado na análise (padrão: `gemini-2.5-flash`) |

### Modelos recomendados

| Modelo | Uso |
|--------|-----|
| `gemini-2.5-flash` | Padrão — rápido e bom custo |
| `gemini-2.5-pro` | Editais longos e análise mais detalhada |
| `gemini-2.5-flash-lite` | Mais barato, análises simples |
| `gemini-3-flash-preview` | Modelo mais recente (preview) |

> **Atenção:** modelos antigos como `gemini-2.0-flash` foram descontinuados pela Google. Se você configurou esse modelo na Vercel, troque por `gemini-2.5-flash`.

## Uso

```bash
# Desenvolvimento
npm run dev

# Acesse http://localhost:3000
```

1. Envie os PDFs do edital, Termo de Referência e anexos
2. Confirme ou ajuste o tipo de cada documento
3. Clique em **Analisar licitação**
4. Aguarde a geração do resumo executivo
5. Exporte em **PDF**, **Word** ou Markdown

## Deploy na Vercel

### Passo a passo

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub
2. Clique em **Add New Project**
3. Importe o repositório `App-Licita-es` (ou o nome do seu fork)
4. A Vercel detecta automaticamente o Next.js — **não altere** as configurações de build:
   - **Framework Preset:** Next.js
   - **Build Command:** `npm run build`
   - **Output Directory:** (padrão)
5. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |------|-------|
   | `GEMINI_API_KEY` | sua chave `AIza...` do Google AI Studio |
   | `GEMINI_MODEL` | `gemini-2.5-flash` (opcional) |

6. Clique em **Deploy**
7. Após o deploy, acesse a URL gerada (ex.: `https://app-licitacoes.vercel.app`)

### Deploy via CLI (alternativa)

```bash
npm i -g vercel
vercel login
vercel

# Na primeira vez, siga as perguntas:
# - Link to existing project? No
# - Project name: app-licitacoes
# - Directory: ./

# Adicione a variável de ambiente:
vercel env add GEMINI_API_KEY

# Deploy em produção:
vercel --prod
```

### Observações importantes para a Vercel

- **Sem login/Supabase:** o app funciona direto, sem autenticação
- **Timeout da análise:** editais grandes podem demorar. O plano Hobby tem limite de **10 segundos** por função serverless; análises longas podem falhar. No plano Pro, o timeout pode chegar a **60 segundos** (já configurado em `vercel.json`)
- **Chave Gemini:** configure sempre em *Environment Variables* da Vercel, nunca no código
- **Custo Gemini:** cada análise consome tokens da sua conta Google

## Limitações

- **PDFs escaneados (imagem):** a extração de texto pode falhar. Use PDFs com texto selecionável ou considere OCR prévio.
- **Tamanho dos documentos:** documentos muito extensos podem ser truncados para respeitar limites do modelo.
- **Não substitui assessoria jurídica:** a análise é automatizada e deve ser revisada por profissional qualificado.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Google Gemini API](https://ai.google.dev/)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse)
- [docx](https://www.npmjs.com/package/docx) — exportação Word
- [pdfmake](https://pdfmake.github.io/docs/) — exportação PDF
- [react-markdown](https://github.com/remarkjs/react-markdown)

## Scripts

```bash
npm run dev      # Servidor de desenvolvimento
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # Verificação ESLint
```

## Estrutura do projeto

```
src/
├── app/
│   ├── api/analyze/route.ts   # Endpoint de análise
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AnalyzerApp.tsx        # Interface principal
│   ├── AnalysisResult.tsx     # Exibição do resultado
│   └── ExportButtons.tsx      # Botões PDF / Word / Markdown
└── lib/
    ├── analysis-prompt.ts     # Prompt e estrutura dos 18 tópicos
    ├── analyze.ts             # Integração com OpenAI
    ├── export-pdf.ts          # Geração de PDF
    ├── export-word.ts         # Geração de Word
    ├── markdown-blocks.ts     # Parser de markdown para export
    └── pdf.ts                 # Extração de texto de PDF
```

## Licença

Uso interno da empresa.
