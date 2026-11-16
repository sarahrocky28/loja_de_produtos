-- CONNECTION: name=vortex.sqlite
-- ==========================================================
-- VORTEX CORE - SCRIPT COMPLETO (SQLite)
-- No DBeaver: crie uma conexao SQLite apontando para um arquivo novo
-- (ex.: vortex.sqlite), abra este script e use "Executar script" (Alt+X).
-- Valores em dinheiro ficam em CENTAVOS (R$ 129,90 = 12990).
-- ==========================================================

-- Ativa as chaves estrangeiras do SQLite (vem desligado por padrao)
PRAGMA foreign_keys = 1;
-- Verifica se as chaves estrangeiras estao ativas (deve retornar 1)
PRAGMA foreign_keys;
-- Versao do SQLite (STRICT exige 3.37 ou maior)
SELECT sqlite_version();

-- ==========================================================
-- 0. LIMPEZA (permite rodar o script varias vezes)
-- Ordem: primeiro quem depende dos outros
-- ==========================================================
DROP VIEW IF EXISTS vw_estoque_baixo;
DROP VIEW IF EXISTS vw_catalogo;
DROP VIEW IF EXISTS vw_pedidos_resumo;
DROP TABLE IF EXISTS redefinicoes_senha;
DROP TABLE IF EXISTS favoritos;
DROP TABLE IF EXISTS produto_imagens;
DROP TABLE IF EXISTS mensagens_contato;
DROP TABLE IF EXISTS pagamentos;
DROP TABLE IF EXISTS itens_pedido;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS cupons;
DROP TABLE IF EXISTS carrinho_itens;
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS enderecos;
DROP TABLE IF EXISTS usuarios;

-- ==========================================================
-- 1. ESTRUTURA DAS TABELAS (DDL)
-- ==========================================================
CREATE TABLE usuarios (
	id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
	nome TEXT NOT NULL,
	email TEXT NOT NULL COLLATE NOCASE UNIQUE,
	senha_hash TEXT NOT NULL,
	perfil TEXT NOT NULL DEFAULT 'cliente' CHECK (perfil IN ('cliente', 'admin')),
	ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
	criado_em TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
) STRICT;

CREATE TABLE enderecos (
	id_endereco INTEGER PRIMARY KEY AUTOINCREMENT,
	id_usuario INTEGER NOT NULL,
	destinatario TEXT NOT NULL,
	cep TEXT NOT NULL CHECK (LENGTH(cep) = 8 AND cep NOT GLOB '*[^0-9]*'),
	logradouro TEXT NOT NULL,
	numero TEXT NOT NULL,
	complemento TEXT,
	bairro TEXT NOT NULL,
	cidade TEXT NOT NULL,
	uf TEXT NOT NULL CHECK (LENGTH(uf) = 2),
	padrao INTEGER NOT NULL DEFAULT 0 CHECK (padrao IN (0, 1)),
	FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) STRICT;

CREATE TABLE categorias (
	id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,
	nome TEXT NOT NULL COLLATE NOCASE UNIQUE
) STRICT;

CREATE TABLE produtos (
	id_produto INTEGER PRIMARY KEY AUTOINCREMENT,
	id_categoria INTEGER NOT NULL,
	nome TEXT NOT NULL,
	descricao TEXT,
	preco INTEGER NOT NULL CHECK (preco >= 0),
	estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
	imagem TEXT,
	ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
	FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
) STRICT;

CREATE INDEX idx_produtos_nome ON produtos (nome);

-- Relacionamento N:N entre usuarios e produtos (carrinho)
CREATE TABLE carrinho_itens (
	id_usuario INTEGER NOT NULL,
	id_produto INTEGER NOT NULL,
	quantidade INTEGER NOT NULL CHECK (quantidade > 0),
	PRIMARY KEY (id_usuario, id_produto),
	FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
	FOREIGN KEY (id_produto) REFERENCES produtos(id_produto) ON DELETE CASCADE
) STRICT;

-- valor_desconto: percentual = 1 a 100 | valor_fixo = centavos
CREATE TABLE cupons (
	id_cupom INTEGER PRIMARY KEY AUTOINCREMENT,
	codigo TEXT NOT NULL COLLATE NOCASE UNIQUE,
	tipo_desconto TEXT NOT NULL CHECK (tipo_desconto IN ('percentual', 'valor_fixo')),
	valor_desconto INTEGER NOT NULL CHECK (valor_desconto > 0),
	validade TEXT NOT NULL,
	ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
	CHECK (tipo_desconto <> 'percentual' OR valor_desconto <= 100)
) STRICT;

CREATE TABLE pedidos (
	id_pedido INTEGER PRIMARY KEY AUTOINCREMENT,
	id_usuario INTEGER NOT NULL,
	id_endereco INTEGER NOT NULL,
	id_cupom INTEGER,
	data_pedido TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	subtotal INTEGER NOT NULL,
	desconto INTEGER NOT NULL DEFAULT 0,
	frete INTEGER NOT NULL DEFAULT 0,
	entrega TEXT NOT NULL DEFAULT 'padrao' CHECK (entrega IN ('padrao', 'expressa', 'retirada')),
	total INTEGER NOT NULL,
	status TEXT NOT NULL DEFAULT 'aguardando_pagamento' CHECK (status IN ('aguardando_pagamento', 'pago', 'em_separacao', 'enviado', 'entregue', 'cancelado')),
	codigo_rastreio TEXT,
	previsao_entrega TEXT,
	FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
	FOREIGN KEY (id_endereco) REFERENCES enderecos(id_endereco),
	FOREIGN KEY (id_cupom) REFERENCES cupons(id_cupom),
	CHECK (subtotal >= 0 AND desconto >= 0 AND frete >= 0 AND desconto <= subtotal),
	CHECK (total = subtotal - desconto + frete)
) STRICT;

CREATE INDEX idx_pedidos_usuario_data ON pedidos (id_usuario, data_pedido);

-- preco_unitario: preco congelado no momento da compra (centavos)
CREATE TABLE itens_pedido (
	id_item INTEGER PRIMARY KEY AUTOINCREMENT,
	id_pedido INTEGER NOT NULL,
	id_produto INTEGER NOT NULL,
	quantidade INTEGER NOT NULL CHECK (quantidade > 0),
	preco_unitario INTEGER NOT NULL CHECK (preco_unitario >= 0),
	FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
	FOREIGN KEY (id_produto) REFERENCES produtos(id_produto)
) STRICT;

-- mp_payment_id: id do pagamento no Mercado Pago
CREATE TABLE pagamentos (
	id_pagamento INTEGER PRIMARY KEY AUTOINCREMENT,
	id_pedido INTEGER NOT NULL,
	mp_payment_id TEXT UNIQUE,
	metodo TEXT NOT NULL CHECK (metodo IN ('pix', 'cartao', 'boleto')),
	status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'recusado', 'cancelado')),
	valor INTEGER NOT NULL CHECK (valor > 0),
	criado_em TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	data_aprovacao TEXT,
	FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido)
) STRICT;

CREATE INDEX idx_pagamentos_pedido ON pagamentos (id_pedido);

-- Mensagens enviadas pelo formulario "Fale conosco"
CREATE TABLE mensagens_contato (
	id_mensagem INTEGER PRIMARY KEY AUTOINCREMENT,
	nome TEXT NOT NULL,
	email TEXT NOT NULL,
	mensagem TEXT NOT NULL,
	criado_em TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime'))
) STRICT;


-- Varias imagens por produto (a de ordem 0 e a principal; produtos.imagem guarda a principal)
CREATE TABLE produto_imagens (
	id_imagem INTEGER PRIMARY KEY AUTOINCREMENT,
	id_produto INTEGER NOT NULL,
	arquivo TEXT NOT NULL,
	ordem INTEGER NOT NULL DEFAULT 0,
	FOREIGN KEY (id_produto) REFERENCES produtos(id_produto) ON DELETE CASCADE
) STRICT;

-- Produtos favoritos de cada usuario
CREATE TABLE favoritos (
	id_usuario INTEGER NOT NULL,
	id_produto INTEGER NOT NULL,
	criado_em TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
	PRIMARY KEY (id_usuario, id_produto),
	FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
	FOREIGN KEY (id_produto) REFERENCES produtos(id_produto) ON DELETE CASCADE
) STRICT;

-- Links de "esqueci a senha" (guarda so o hash do codigo, nunca o codigo)
CREATE TABLE redefinicoes_senha (
	id_redefinicao INTEGER PRIMARY KEY AUTOINCREMENT,
	id_usuario INTEGER NOT NULL,
	token_hash TEXT NOT NULL UNIQUE,
	expira_em TEXT NOT NULL,
	usado INTEGER NOT NULL DEFAULT 0 CHECK (usado IN (0, 1)),
	FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) STRICT;

-- ==========================================================
-- 2. POPULACAO DE DADOS (DML)
-- Senha de TODOS os usuarios de teste: Vortex@123 (hash bcrypt)
-- Enderecos e nomes sao ficticios.
-- ==========================================================
-- 2.1. Usuarios (1 admin e 3 clientes)
INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES
	('Administrador Vortex', 'admin@vortex.com', '$2b$10$Kvc47upvT4uwvGrJMtaMGuQxP1v0Uged/A.2Ins8ciw2XTojkRGDW', 'admin'),
	('Marcos Vinicius Souza', 'marcos.souza@email.com', '$2b$10$Kvc47upvT4uwvGrJMtaMGuQxP1v0Uged/A.2Ins8ciw2XTojkRGDW', 'cliente'),
	('Fernanda Maria Oliveira', 'fernanda.oliveira@email.com', '$2b$10$Kvc47upvT4uwvGrJMtaMGuQxP1v0Uged/A.2Ins8ciw2XTojkRGDW', 'cliente'),
	('Roberto Carlos Andrade', 'roberto.andrade@email.com', '$2b$10$Kvc47upvT4uwvGrJMtaMGuQxP1v0Uged/A.2Ins8ciw2XTojkRGDW', 'cliente');

-- 2.2. Enderecos
INSERT INTO enderecos (id_usuario, destinatario, cep, logradouro, numero, complemento, bairro, cidade, uf, padrao) VALUES
	(2, 'Marcos Vinicius Souza', '01310100', 'Avenida Paulista', '1000', 'Apto 51', 'Bela Vista', 'São Paulo', 'SP', 1),
	(3, 'Fernanda Maria Oliveira', '20040020', 'Rua da Assembleia', '10', NULL, 'Centro', 'Rio de Janeiro', 'RJ', 1),
	(4, 'Roberto Carlos Andrade', '30130010', 'Avenida Afonso Pena', '500', 'Sala 3', 'Centro', 'Belo Horizonte', 'MG', 1),
	(2, 'Marcos Vinicius Souza', '04538132', 'Avenida Brigadeiro Faria Lima', '3477', NULL, 'Itaim Bibi', 'São Paulo', 'SP', 0);

-- 2.3. Categorias
INSERT INTO categorias (nome) VALUES
	('Proteínas'),
	('Creatinas'),
	('Pré-treinos e Energia'),
	('Aminoácidos'),
	('Vitaminas e Minerais'),
	('Acessórios'),
	('Roupas');

-- 2.4. Produtos (precos em centavos)
INSERT INTO produtos (id_categoria, nome, descricao, preco, estoque, imagem) VALUES
	(1, 'Whey Protein Concentrado 900g - Baunilha', 'Proteína concentrada do soro do leite, 24g de proteína por dose.', 12990, 40, 'whey-concentrado-baunilha.jpg'),
	(1, 'Whey Protein Isolado 900g - Chocolate', 'Isolado de alta pureza, baixo teor de lactose.', 18990, 25, 'whey-isolado-chocolate.jpg'),
	(1, 'Albumina 500g - Morango', 'Proteína do ovo de absorção lenta.', 6990, 30, 'albumina-morango.jpg'),
	(2, 'Creatina Monohidratada 300g', 'Creatina pura para ganho de força e desempenho.', 8990, 50, 'creatina-300g.jpg'),
	(2, 'Creatina Creapure 250g', 'Creatina de origem alemã com alto grau de pureza.', 14990, 20, 'creapure-250g.jpg'),
	(3, 'Pré-Treino Explosão 300g - Frutas Vermelhas', 'Fórmula com cafeína, beta-alanina e citrulina.', 11990, 35, 'pre-treino-explosao.jpg'),
	(3, 'Cafeína 200mg - 60 cápsulas', 'Energia e foco para o treino.', 3990, 60, 'cafeina-60.jpg'),
	(4, 'BCAA 2:1:1 - 120 cápsulas', 'Aminoácidos de cadeia ramificada.', 5990, 45, 'bcaa-120.jpg'),
	(4, 'Glutamina 300g', 'Auxilia na recuperação muscular.', 7990, 30, 'glutamina-300g.jpg'),
	(5, 'Multivitamínico - 60 cápsulas', 'Vitaminas e minerais essenciais.', 4990, 70, 'multivitaminico-60.jpg'),
	(5, 'Ômega 3 - 120 cápsulas', 'Óleo de peixe rico em EPA e DHA.', 6490, 40, 'omega3-120.jpg'),
	(6, 'Coqueteleira 600ml', 'Coqueteleira com divisória para suplementos.', 2990, 100, 'coqueteleira-600.jpg'),
	(6, 'Luva de Treino', 'Luva com proteção para as palmas.', 4590, 25, 'luva-treino.jpg'),
	(6, 'Cinta Lombar', 'Suporte lombar para treinos pesados.', 8990, 15, 'cinta-lombar.jpg'),
	(6, 'Kit 3 Faixas Elásticas', 'Faixas de resistência leve, média e forte.', 3490, 0, 'faixas-elasticas.jpg'),
	(7, 'Camiseta Vortex Core Preta', 'Camiseta dry fit com a marca Vortex Core.', 7990, 30, 'camiseta-vortex.jpg'),
	(7, 'Regata Vortex Core', 'Regata leve para treinos intensos.', 6990, 25, 'regata-vortex.jpg');

-- 2.4.1. Imagens dos produtos (a principal de cada um)
INSERT INTO produto_imagens (id_produto, arquivo, ordem)
SELECT id_produto, imagem, 0 FROM produtos WHERE imagem IS NOT NULL;

-- 2.5. Cupons (valor_desconto: percentual = %, valor_fixo = centavos)
INSERT INTO cupons (codigo, tipo_desconto, valor_desconto, validade, ativo) VALUES
	('BEMVINDO10', 'percentual', 10, '2027-12-31', 1),
	('VORTEX20', 'valor_fixo', 2000, '2027-12-31', 1),
	('EXPIRADO15', 'percentual', 15, '2025-01-31', 1),
	('DESATIVADO5', 'percentual', 5, '2027-12-31', 0);

-- 2.6. Carrinho (Fernanda tem itens no carrinho)
INSERT INTO carrinho_itens (id_usuario, id_produto, quantidade) VALUES
	(3, 4, 2),
	(3, 12, 1);

-- 2.7. Pedidos
-- Regra de frete: R$ 19,90 fixo (1990). Subtotal acima de R$ 199,00 (19900): frete gratis.
-- Pedido 1: Marcos | 12990 + 8990 = 21980 (frete gratis) | entregue
-- Pedido 2: Fernanda | 2x2990 + 3990 = 9970 | cupom BEMVINDO10 (-997) + frete 1990 = 10963 | enviado
-- Pedido 3: Marcos | 11990 | cupom VORTEX20 (-2000) + frete 1990 = 11980 | aguardando pagamento
INSERT INTO pedidos (id_usuario, id_endereco, id_cupom, data_pedido, subtotal, desconto, frete, total, status, codigo_rastreio, previsao_entrega) VALUES
	(2, 1, NULL, '2026-10-20 10:15:00', 21980, 0, 0, 21980, 'entregue', 'VX000000001BR', '2026-10-27'),
	(3, 2, 1, '2026-10-30 14:40:00', 9970, 997, 1990, 10963, 'enviado', 'VX000000002BR', '2026-11-08'),
	(2, 1, 2, '2026-11-02 09:05:00', 11990, 2000, 1990, 11980, 'aguardando_pagamento', NULL, NULL);

-- 2.8. Itens dos pedidos (preco_unitario congelado)
INSERT INTO itens_pedido (id_pedido, id_produto, quantidade, preco_unitario) VALUES
	(1, 1, 1, 12990),
	(1, 4, 1, 8990),
	(2, 12, 2, 2990),
	(2, 7, 1, 3990),
	(3, 6, 1, 11990);

-- 2.9. Pagamentos (mp_payment_id ficticio)
INSERT INTO pagamentos (id_pedido, mp_payment_id, metodo, status, valor, criado_em, data_aprovacao) VALUES
	(1, '1000000001', 'pix', 'aprovado', 21980, '2026-10-20 10:16:00', '2026-10-20 10:17:00'),
	(2, '1000000002', 'cartao', 'aprovado', 10963, '2026-10-30 14:41:00', '2026-10-30 14:41:30'),
	(3, NULL, 'pix', 'pendente', 11980, '2026-11-02 09:06:00', NULL);

-- ==========================================================
-- 3. VIEWS
-- ==========================================================
CREATE VIEW vw_catalogo AS
SELECT
	p.id_produto,
	p.nome,
	c.nome AS categoria,
	p.preco,
	p.estoque,
	p.imagem
FROM produtos p
JOIN categorias c ON p.id_categoria = c.id_categoria
WHERE p.ativo = 1;

CREATE VIEW vw_estoque_baixo AS
SELECT
	id_produto,
	nome,
	estoque
FROM produtos
WHERE estoque <= 20
	AND ativo = 1
ORDER BY estoque ASC;

CREATE VIEW vw_pedidos_resumo AS
SELECT
	pe.id_pedido,
	u.nome AS cliente,
	pe.data_pedido,
	pe.total,
	pe.status AS status_pedido,
	pg.metodo,
	pg.status AS status_pagamento
FROM pedidos pe
JOIN usuarios u ON pe.id_usuario = u.id_usuario
LEFT JOIN pagamentos pg ON pg.id_pedido = pe.id_pedido;

-- ==========================================================
-- 4. CONSULTAS DE TESTE
-- ==========================================================
-- 4.1. Catalogo com categoria
SELECT * FROM vw_catalogo ORDER BY categoria, nome;

-- 4.2. Busca por nome e filtro de categoria (RF-03)
SELECT * FROM vw_catalogo WHERE categoria = 'Creatinas' OR nome LIKE '%whey%';

-- 4.3. Produtos com estoque baixo (painel admin)
SELECT * FROM vw_estoque_baixo;

-- 4.4. Carrinho da Fernanda com subtotal por item
SELECT
	p.nome,
	ci.quantidade,
	p.preco,
	ci.quantidade * p.preco AS subtotal_item
FROM carrinho_itens ci
JOIN produtos p ON ci.id_produto = p.id_produto
WHERE ci.id_usuario = 3;

-- 4.5. Cupom valido (ativo e dentro da validade): deve retornar BEMVINDO10
SELECT * FROM cupons WHERE codigo = 'BEMVINDO10' AND ativo = 1 AND validade >= DATE('now', 'localtime');

-- 4.6. Cupom expirado: nao deve retornar nada
SELECT * FROM cupons WHERE codigo = 'EXPIRADO15' AND ativo = 1 AND validade >= DATE('now', 'localtime');

-- 4.7. Resumo de pedidos
SELECT * FROM vw_pedidos_resumo ORDER BY data_pedido DESC;

-- 4.8. Historico do cliente com itens (RF-09)
SELECT
	pe.id_pedido,
	pe.data_pedido,
	pr.nome AS produto,
	ip.quantidade,
	ip.preco_unitario,
	pe.status
FROM pedidos pe
JOIN itens_pedido ip ON ip.id_pedido = pe.id_pedido
JOIN produtos pr ON ip.id_produto = pr.id_produto
WHERE pe.id_usuario = 2
ORDER BY pe.data_pedido DESC;

-- 4.9. Conferencia: subtotal do pedido = soma dos itens (nenhuma linha deve aparecer)
SELECT
	pe.id_pedido,
	pe.subtotal,
	SUM(ip.quantidade * ip.preco_unitario) AS soma_itens
FROM pedidos pe
JOIN itens_pedido ip ON ip.id_pedido = pe.id_pedido
GROUP BY pe.id_pedido, pe.subtotal
HAVING pe.subtotal <> SUM(ip.quantidade * ip.preco_unitario);

-- ==========================================================
-- 5. EXEMPLO DA TRANSACAO DE FINALIZACAO DE PEDIDO (RF-07 / RB-08)
-- Quem executa isso de verdade e a API (Express). Fica comentado como referencia.
-- No SQLite nao existe "FOR UPDATE": BEGIN IMMEDIATE ja trava o banco para escrita.
-- ==========================================================
-- BEGIN IMMEDIATE;
--   INSERT INTO pedidos (id_usuario, id_endereco, subtotal, desconto, frete, total)
--     VALUES (3, 2, 17980, 0, 0, 17980);
--   INSERT INTO itens_pedido (id_pedido, id_produto, quantidade, preco_unitario)
--     VALUES (last_insert_rowid(), 4, 2, 8990);
--   UPDATE produtos SET estoque = estoque - 2 WHERE id_produto = 4;  -- erro se ficar negativo
--   DELETE FROM carrinho_itens WHERE id_usuario = 3;
-- COMMIT;  -- se der qualquer erro: ROLLBACK;

-- ==========================================================
-- 6. TESTES DE REGRAS (descomente UMA linha por vez; todas devem dar ERRO)
-- ==========================================================
-- INSERT INTO produtos (id_categoria, nome, preco, estoque) VALUES (1, 'Teste', -100, 1);       -- preco negativo
-- INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Dup', 'ADMIN@vortex.com', 'x');        -- e-mail repetido
-- INSERT INTO carrinho_itens (id_usuario, id_produto, quantidade) VALUES (3, 1, 0);              -- quantidade zero
-- INSERT INTO pedidos (id_usuario, id_endereco, subtotal, desconto, frete, total) VALUES (2, 1, 1000, 0, 0, 999); -- total nao bate
-- DELETE FROM categorias WHERE id_categoria = 1;                                                 -- categoria com produtos
