-- Criar tabela climbing_sessions
CREATE TABLE IF NOT EXISTS climbing_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_email TEXT NOT NULL,
    place TEXT NOT NULL,
    "when" DATE NOT NULL,
    timeOfDay TEXT NOT NULL DEFAULT 'Morning',
    activity TEXT NOT NULL DEFAULT 'Climbing',
    climbingType TEXT,
    routeNumber TEXT,
    grade TEXT,
    difficulty TEXT NOT NULL DEFAULT 'Smooth',
    effort TEXT NOT NULL DEFAULT 'Moderate',
    falls TEXT DEFAULT '0',
    ascentType TEXT NOT NULL DEFAULT 'Redpoint',
    colour TEXT,
    routeRating TEXT,
    settersRating TEXT,
    suggestedGrade TEXT,
    howItFelt TEXT,
    movement TEXT,
    grip TEXT,
    footwork TEXT,
    comments TEXT
);

-- Criar índice para melhorar performance nas consultas por usuário
CREATE INDEX IF NOT EXISTS idx_climbing_sessions_user_email 
ON climbing_sessions(user_email);

-- Criar índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_climbing_sessions_created_at 
ON climbing_sessions(created_at DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE climbing_sessions ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas suas próprias sessões
CREATE POLICY "Users can view own sessions" ON climbing_sessions
    FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- Política para permitir que usuários insiram suas próprias sessões
CREATE POLICY "Users can insert own sessions" ON climbing_sessions
    FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Política para permitir que usuários atualizem suas próprias sessões
CREATE POLICY "Users can update own sessions" ON climbing_sessions
    FOR UPDATE USING (auth.jwt() ->> 'email' = user_email);

-- Política para permitir que usuários deletem suas próprias sessões
CREATE POLICY "Users can delete own sessions" ON climbing_sessions
    FOR DELETE USING (auth.jwt() ->> 'email' = user_email);

/*
INSTRUÇÕES PARA USAR:

1. Vá para https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em SQL Editor
4. Cole este código e execute
5. A tabela será criada com todas as colunas necessárias
6. As políticas de segurança garantem que cada usuário veja apenas suas próprias sessões

NOTA: As políticas RLS estão configuradas para funcionar com autenticação do Supabase.
Como estamos usando Google Sign-In customizado, você pode precisar ajustar as políticas
ou desabilitar RLS temporariamente para testes:

-- Para desabilitar RLS temporariamente (APENAS PARA DESENVOLVIMENTO):
-- ALTER TABLE climbing_sessions DISABLE ROW LEVEL SECURITY;
*/ 