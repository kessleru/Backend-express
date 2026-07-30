-- CreateTable
CREATE TABLE "cursos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "horas" INTEGER NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "cursos_titulo_key" ON "cursos"("titulo");

-- CreateIndex
CREATE INDEX "cursos_publicado_idx" ON "cursos"("publicado");
