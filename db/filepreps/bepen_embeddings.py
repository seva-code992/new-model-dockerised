import numpy 
from sentence_transformers import SentenceTransformer
import httpx
import os
import gzip
import csv
from pathlib import Path




############################################################################################################################################################################################################################################
#Compute the embeddings for Bepen#
############################################################################################################################################################################################################################################

model = SentenceTransformer(
    "FremyCompany/BioLORD-2023",
    prompts={"retrieval": "Represent this sentence for searching relevant passages: "},
)


p= Path(__file__).resolve().parent / "bepen.csv"
lines = p.read_text().splitlines()

ID = []
description = [] 


for line in lines:
    id_, desc = line.split(",", 1)  
    ID.append(id_)
    description.append(desc)


print(f"These are the first 10 lines of IDs with their description for Bepen: {list(zip(ID, description))[:10]}")


gene_ids_file = "bepen-gene-ids.npy"
embeddings_file = "bepen-embeddings.npy"

if os.path.exists(embeddings_file): 
    print("Loading embeddings from disk for Bepen...")
    embeddings = numpy.load(embeddings_file)
    gene_ids = list(numpy.load(gene_ids_file, allow_pickle=True))
else:
    print(f"Computing embeddings for {len(description)} gene descriptions for Bepen...")
    embeddings = model.encode(description, show_progress_bar=True)
    numpy.save(embeddings_file, embeddings)
    numpy.save(gene_ids_file, numpy.array(ID, dtype=object))
    print("Embeddings saved to disk.")
    gene_ids = list(numpy.load(gene_ids_file, allow_pickle=True))
print(f"Embedding matrix shape: {embeddings.shape}")