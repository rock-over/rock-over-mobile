-- Apagar tabela existente (se houver)
DROP TABLE IF EXISTS climbing_sessions;

-- Recriar tabela sem valores default
CREATE TABLE climbing_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_email TEXT NOT NULL,
    place TEXT,
    "when" DATE NOT NULL,
    "timeOfDay" TEXT,
    activity TEXT,
    "climbingType" TEXT,
    "routeNumber" TEXT,
    grade TEXT,
    difficulty TEXT,
    effort TEXT,
    falls TEXT,
    "ascentType" TEXT,
    colour TEXT,
    "routeRating" TEXT,
    "settersRating" TEXT,
    "suggestedGrade" TEXT,
    "howItFelt" TEXT,
    movement TEXT,
    grip TEXT,
    footwork TEXT,
    comments TEXT
);

-- Criar índices para performance
CREATE INDEX idx_climbing_sessions_user_email ON climbing_sessions(user_email);
CREATE INDEX idx_climbing_sessions_created_at ON climbing_sessions(created_at DESC);

-- Desabilitar RLS temporariamente para testes
ALTER TABLE climbing_sessions DISABLE ROW LEVEL SECURITY;

/*
ESTRUTURA LIMPA:
- Apenas id, created_at e when são obrigatórios
- user_email é obrigatório para identificar o usuário
- Todos os outros campos podem ser NULL
- Sem valores default (exceto id e created_at que são automáticos)
- RLS desabilitado para facilitar testes
*/ 