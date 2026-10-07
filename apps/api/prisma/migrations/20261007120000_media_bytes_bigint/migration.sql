-- Media.bytes : entier 64 bits (sources vidéo de plus de 2 Gio). Élargissement sans perte de données.
ALTER TABLE "media" ALTER COLUMN "bytes" SET DATA TYPE BIGINT;
