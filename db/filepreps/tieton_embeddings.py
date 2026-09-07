import numpy
from sentence_transformers import SentenceTransformer
import httpx
import os
import csv
from pathlib import Path




############################################################################################################################################################################################################################################
#Compute the embeddings for Tieton#
############################################################################################################################################################################################################################################
model = SentenceTransformer(
    "FremyCompany/BioLORD-2023",
    prompts={"retrieval": "Represent this sentence for searching relevant passages: "},
)



p= Path(__file__).resolve().parent / "tieton.csv"
lines = p.read_text().splitlines()

ID = []
description = []


for line in lines:
    id_, desc = line.split(",", 1)
    ID.append(id_)
    description.append(desc)


print(f"These are the first 10 lines of IDs with their description for Tieton: {list(zip(ID, description))[:10]}")


gene_ids_file = "tieton-gene-ids.npy"
embeddings_file = "tieton-embeddings.npy"

if os.path.exists(embeddings_file):
    print("Loading embeddings from disk for Tieton...")
    embeddings = numpy.load(embeddings_file)
    gene_ids = list(numpy.load(gene_ids_file, allow_pickle=True))
else:
    print(f"Computing embeddings for {len(description)} gene descriptions for Tieton...")
    embeddings = model.encode(description, show_progress_bar=True)
    numpy.save(embeddings_file, embeddings)
    numpy.save(gene_ids_file, numpy.array(ID, dtype=object))
    print("Embeddings saved to disk.")
    gene_ids = list(numpy.load(gene_ids_file, allow_pickle=True))
print(f"Embedding matrix shape: {embeddings.shape}")