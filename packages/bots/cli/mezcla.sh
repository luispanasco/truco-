#!/bin/sh
# Uso: sh cli/mezcla.sh claves formato [ajustes] — 8 procesos de 150 partidas (1200 en total).
claves=$1; formato=$2; ajustes=${3:-'{}'}
tot=0; gan=0
for k in 0 1 2 3 4 5 6 7; do npx tsx cli/mezcla.ts "$claves" 150 "$formato" $((k * 150)) "$ajustes" > /tmp/mz.$$.$k & done
wait
for k in 0 1 2 3 4 5 6 7; do g=$(cut -d/ -f1 /tmp/mz.$$.$k); gan=$((gan + g)); tot=$((tot + 150)); rm /tmp/mz.$$.$k; done
echo "$claves $formato $ajustes: $gan/$tot = $((1000 * gan / tot))‰"
