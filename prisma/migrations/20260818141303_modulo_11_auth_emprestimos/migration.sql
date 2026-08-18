-- CreateTable
CREATE TABLE "usuarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'leitor',
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "emprestimos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "livro_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "pego_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "devolvido_em" DATETIME,
    CONSTRAINT "emprestimos_livro_id_fkey" FOREIGN KEY ("livro_id") REFERENCES "livros" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "emprestimos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "jti" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" INTEGER NOT NULL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "emprestimos_usuario_id_idx" ON "emprestimos"("usuario_id");

-- CreateIndex
CREATE INDEX "emprestimos_livro_id_devolvido_em_idx" ON "emprestimos"("livro_id", "devolvido_em");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuario_id_idx" ON "refresh_tokens"("usuario_id");
