# Bibliô - Catálogo de Livros

Uma aplicação moderna para organizar e gerenciar sua biblioteca pessoal. Adicione livros via código de barras ou busca manual, avalie, anote e exporte sua coleção.

## Recursos

- **Scanner de Código de Barras**: Adicione livros rapidamente usando a câmera do seu dispositivo
- **Busca de Livros**: Integração com Google Books e Open Library para buscar por título ou autor
- **Gerenciamento**: Organize livros lidos/não lidos, adicione avaliações e notas pessoais
- **Painel Admin**: Visualize, filtre, ordene e exporte sua biblioteca em CSV
- **PWA**: Funciona offline, instale como app no seu dispositivo
- **Autenticação Segura**: Login com Supabase, dados protegidos com Row Level Security

## Stack Tecnológico

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth)
- **APIs**: Google Books API, Open Library API
- **Deployment**: Vercel
- **PWA**: Service Worker para funcionamento offline

## Começando

### Pré-requisitos

- Node.js 18+
- pnpm (ou npm/yarn)
- Conta Supabase
- Chaves do Google Books API (opcional, mas recomendado)

### Instalação

1. Clone ou faça download do repositório
2. Instale dependências:
   ```bash
   pnpm install
   ```

3. Configure variáveis de ambiente (`.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
   NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
   ```

4. Execute o servidor de desenvolvimento:
   ```bash
   pnpm dev
   ```

5. Abra [http://localhost:3000](http://localhost:3000) no navegador

## Configuração Supabase

### 1. Criar Projeto
- Acesse [supabase.com](https://supabase.com)
- Crie um novo projeto
- Copie `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Schema do Banco
A tabela `livros` já está configurada com:
- ID único (UUID)
- Associação com usuário (user_id)
- ISBN, título, autor, editora
- Descrição e URL da capa
- Status de leitura e avaliação
- Notas pessoais
- Row Level Security ativado

## Rotas Principais

- `/` - Página inicial
- `/auth/login` - Fazer login
- `/auth/sign-up` - Criar conta
- `/scanner` - Adicionar livro por ISBN ou câmera
- `/search` - Buscar livros
- `/confirm` - Confirmar e salvar livro
- `/admin` - Painel de gerenciamento

## Recursos do Admin

- Listar todos os livros
- Filtrar por status (lido/não lido) e avaliação
- Buscar por título, autor, editora ou ISBN
- Ordenar por data, título ou autor
- Exportar em CSV para backup
- Deletar livros

## Deploy no Vercel

### Opção 1: GitHub
1. Push do projeto para GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Conecte seu repositório
4. Configure variáveis de ambiente
5. Deploy automático

### Opção 2: CLI Vercel
```bash
npm i -g vercel
vercel
```

### Variáveis de Ambiente no Vercel
Adicione em Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## PWA (Instalação como App)

### Desktop
1. Abra a aplicação no navegador
2. Clique no ícone de instalação (canto superior direito)
3. "Instalar Bibliô"

### Mobile
1. Abra em navegador (Chrome, Edge, Safari)
2. Menu → "Adicionar à tela inicial"
3. Acesse como app nativo

## Uso Offline

- Livros já adicionados carregam do cache
- Busca offline usa cache anterior
- Novo conteúdo sincroniza ao conectar

## APIs Externas

### Google Books API
- Busca por título, autor, ISBN
- Metadados e capas dos livros
- Sem limite de taxa para uso básico

### Open Library API
- Busca por ISBN preferencial
- Informações detalhadas de livros
- API pública e gratuita

## Estrutura do Projeto

```
app/
├── page.tsx              # Página inicial
├── layout.tsx            # Layout raiz com PWA
├── globals.css           # Estilos globais
├── auth/
│   ├── login/
│   ├── sign-up/
│   ├── callback/
│   └── error/
├── scanner/              # Adicionar livro por ISBN
├── search/               # Buscar livros
├── confirm/              # Confirmar e salvar
└── admin/                # Painel de gerenciamento

lib/
├── supabase/
│   ├── client.ts         # Cliente Supabase (browser)
│   ├── server.ts         # Cliente Supabase (server)
│   └── proxy.ts          # Proxy para middleware
└── book-api.ts           # Integração Google Books + Open Library

public/
├── manifest.json         # Manifest do PWA
├── sw.js                 # Service Worker
└── icons/                # Ícones da aplicação
```

## Troubleshooting

### "Module not found: Card"
Adicione componentes shadcn faltantes:
```bash
pnpm dlx shadcn@latest add card input label textarea
```

### Supabase connection error
- Verifique variáveis de ambiente
- Confirme URL e chaves no painel Supabase
- Tente `pnpm dev` novamente

### Livros não aparecem no admin
- Confirme que você está logado
- Verifique RLS policies no Supabase
- Limpe cache do navegador

## Desenvolvimento

### Adicionar novo componente shadcn
```bash
pnpm dlx shadcn@latest add [nome-componente]
```

### Build para produção
```bash
pnpm build
pnpm start
```

### Lint e Type Check
```bash
pnpm lint
pnpm type-check
```

## Roadmap

- [ ] Leitura em tempo real de código de barras com camera
- [ ] Recomendações baseadas em avaliações
- [ ] Compartilhamento de listas com amigos
- [ ] Sincronização com Goodreads
- [ ] Estatísticas de leitura
- [ ] Temas customizados

## Contribuindo

Contribuições são bem-vindas! Por favor:
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

MIT

## Contato & Suporte

Para reportar bugs ou sugerir features, abra uma issue no GitHub ou entre em contato.

---

Feito com ❤️ usando [v0](https://v0.dev)
