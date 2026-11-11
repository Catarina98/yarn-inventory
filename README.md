# Yarn Inventory

## Executar localmente

Na pasta do projeto, executa `python -m http.server 8000` e abre
[localhost:8000](http://localhost:8000). Sem configuração Supabase, o site
apresenta o catálogo original dos ficheiros JSON em modo de consulta.

## Ligar ao Supabase e publicar no GitHub Pages

1. Cria ou abre um projeto no Supabase. No **SQL Editor**, executa
   [schema.sql](supabase/schema.sql) e depois [seed.sql](supabase/seed.sql).
   A importação inicial inclui as 10 linhas e as 647 cores do repositório.
   Podes voltar a executar a importação sem repor as quantidades já guardadas.
2. Em **Authentication → Users**, cria a tua conta com email e palavra-passe
   e confirma o email. Copia o **User UID** da conta. No **SQL Editor**,
   substitui `UID_DA_TUA_CONTA` pelo UUID e executa o seguinte comando:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
     || '{"yarn_inventory_owner": true}'::jsonb
   where id = 'UID_DA_TUA_CONTA'::uuid
   returning id, email;
   ```

   O comando deve devolver uma linha com o teu email. Se já tinhas sessão
   iniciada no site, sai e volta a entrar para receber a nova permissão.
3. Preenche `url` e `publishableKey` em [supabase-config.js](supabase-config.js)
   com o **Project URL** e a **Publishable key**. A chave publicável é
   própria para o navegador. Mantém a palavra-passe, as chaves secretas
   e a chave `service_role` fora do repositório.
4. Publica estas alterações na origem que o repositório já usa em
   **Settings → Pages**. Este é o único passo de publicação necessário
   para ativar a edição de stock.

## Atualizar stock

Abre o site no telemóvel ou computador. Seleciona **Entrar para editar**,
escolhe a linha e carrega em **Editar stock** na cor pretendida. Introduz a
quantidade (por exemplo, `1,5`) e carrega em **Guardar**. Noutro dispositivo,
volta a abrir a linha ou atualiza a página para veres o valor guardado.

Qualquer visitante pode consultar o inventário. As políticas do Supabase
permitem alterar apenas a coluna de stock e apenas a contas com a permissão
atribuída no passo 2. Se outro dispositivo alterar a mesma quantidade
enquanto estás a editar, o site recarrega a linha para poderes rever o valor.

[Chaves da API do Supabase](https://supabase.com/docs/guides/getting-started/api-keys)
· [Políticas de acesso do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
