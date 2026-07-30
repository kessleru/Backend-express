-- CreateTable
CREATE TABLE "autores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "nacionalidade" TEXT NOT NULL,
    "nascimento" DATETIME,
    "criado_em" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "livros" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "isbn" TEXT,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "autor_id" INTEGER NOT NULL,
    CONSTRAINT "livros_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "autores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "generos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "livros_generos" (
    "livro_id" INTEGER NOT NULL,
    "genero_id" INTEGER NOT NULL,

    PRIMARY KEY ("livro_id", "genero_id"),
    CONSTRAINT "livros_generos_livro_id_fkey" FOREIGN KEY ("livro_id") REFERENCES "livros" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "livros_generos_genero_id_fkey" FOREIGN KEY ("genero_id") REFERENCES "generos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "livros_isbn_key" ON "livros"("isbn");

-- CreateIndex
CREATE INDEX "livros_autor_id_idx" ON "livros"("autor_id");

-- CreateIndex
CREATE INDEX "livros_disponivel_idx" ON "livros"("disponivel");

-- CreateIndex
CREATE UNIQUE INDEX "generos_nome_key" ON "generos"("nome");
