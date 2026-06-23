# App Licitações

Aplicação web para análise executiva detalhada de editais de licitação pública, Termos de Referência e anexos técnicos, conforme a **Lei nº 14.133/2021**.

O sistema extrai o texto dos PDFs enviados e gera um resumo estruturado em **18 tópicos**, citando página, item ou cláusula de origem — **sem suposições** e apenas com base no conteúdo dos documentos.

## Funcionalidades

- Upload de múltiplos PDFs (Edital, Termo de Referência, anexos)
- Classificação automática do tipo de documento (editável)
- Análise completa em 14 seções estruturadas (tabelas e formato profissional)
- **Chat interativo** para tirar dúvidas sobre o edital após a análise
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
5. Use a aba **Chat** para tirar dúvidas sobre o edital
6. Exporte em **PDF**, **Word** ou Markdown

## Deploy na Render (recomendado)

Ideal para editais de 60+ páginas — **sem limite de 10 segundos** da Vercel.

### Passo a passo

1. Acesse [render.com](https://render.com) e faça login com GitHub
2. Clique em **New +** → **Blueprint** (ou **Web Service**)
3. Conecte o repositório `App-Licita-es`
4. Se usar Blueprint, o Render detecta o `render.yaml` automaticamente
5. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |------|-------|
   | `GEMINI_API_KEY` | sua chave `AIza...` |
   | `GEMINI_ANALYSIS_MODEL` | `gemini-2.5-flash` |
   | `GEMINI_CHAT_MODEL` | `gemini-2.5-flash` |

6. Escolha o plano **Starter** (~US$ 7/mês) — necessário para o app não "dormir"
7. Clique em **Deploy**
8. Aguarde o build (~3–5 min) e acesse a URL gerada (ex.: `https://app-licitacoes.onrender.com`)

### Configuração manual (sem Blueprint)

| Campo | Valor |
|-------|-------|
| **Environment** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | Starter |

### Observações Render

- **Análises longas:** funcionam bem — sem timeout de 10s
- **Plano grátis:** o app "dorme" após inatividade (demora ~1 min para acordar)
- **Plano Starter:** sempre ativo, recomendado para uso na empresa

---

## Como remover da Vercel

Faça isso **depois** de confirmar que o app está funcionando na Render.

### 1. Excluir o projeto na Vercel

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique no projeto **App-Licita-es** (ou nome que você deu)
3. Vá em **Settings** (Configurações)
4. Role até o final → **Delete Project**
5. Digite o nome do projeto para confirmar → **Delete**

### 2. Desconectar o GitHub (opcional)

Se não for usar a Vercel para mais nada:

1. [vercel.com/account](https://vercel.com/account) → **Git** ou **Integrations**
2. Em GitHub, clique em **Manage** → remova acesso ao repositório (opcional)

### 3. Domínio personalizado (se tiver)

Se configurou domínio próprio na Vercel:

1. No painel do seu domínio (Registro.br, Cloudflare, etc.)
2. Apague os registros DNS que apontavam para a Vercel
3. Após deploy na Render, aponte para a URL da Render (se quiser domínio customizado)

### 4. Variáveis de ambiente

As variáveis da Vercel **não migram automaticamente** — copie manualmente:

- `GEMINI_API_KEY` → cole na Render
- `GEMINI_ANALYSIS_MODEL` → cole na Render

### 5. Verificar

- Acesse a URL da Render e teste uma análise
- Só delete na Vercel quando a Render estiver OK

> **Não precisa apagar o repositório no GitHub** — só o projeto na Vercel.

---

## Deploy na Vercel (não recomendado para editais longos)

<details>
<summary>Clique para ver instruções Vercel</summary>

O plano grátis tem limite de **10 segundos** — editais de 60 páginas costumam falhar.

1. Acesse [vercel.com](https://vercel.com)
2. Importe o repositório
3. Adicione `GEMINI_API_KEY` nas variáveis de ambiente
4. Deploy

</details>

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
│   ├── api/chat/route.ts      # Endpoint do chat
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AnalyzerApp.tsx        # Interface principal
│   ├── ResultsTabs.tsx        # Abas Resumo / Chat
│   ├── ChatPanel.tsx          # Chat sobre o edital
│   └── ExportButtons.tsx      # Botões PDF / Word / Markdown
└── lib/
    ├── analysis-prompt.ts     # Prompt e estrutura dos 18 tópicos
    ├── analyze.ts             # Integração análise
    ├── chat.ts                # Integração chat
    ├── gemini.ts              # Cliente Gemini compartilhado
    ├── export-pdf.ts          # Geração de PDF
    ├── export-word.ts         # Geração de Word
    ├── document-parser.ts     # Parser e layout do documento
    └── pdf.ts                 # Extração de texto de PDF
```

## Licença

Uso interno da empresa.
