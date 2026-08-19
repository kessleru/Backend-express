-- CreateTable
CREATE TABLE "usuarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "listas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "criada_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "membros" (
    "lista_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "papel" TEXT NOT NULL,

    PRIMARY KEY ("lista_id", "usuario_id"),
    CONSTRAINT "membros_lista_id_fkey" FOREIGN KEY ("lista_id") REFERENCES "listas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "membros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "itens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "comprado" BOOLEAN NOT NULL DEFAULT false,
    "lista_id" INTEGER NOT NULL,
    CONSTRAINT "itens_lista_id_fkey" FOREIGN KEY ("lista_id") REFERENCES "listas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "membros_usuario_id_idx" ON "membros"("usuario_id");

-- CreateIndex
CREATE INDEX "itens_lista_id_idx" ON "itens"("lista_id");
