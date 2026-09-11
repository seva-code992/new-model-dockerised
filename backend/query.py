import numpy
import os
from sentence_transformers import SentenceTransformer
import httpx
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel
from enum import Enum
from contextlib import asynccontextmanager

from fastapi.middleware.cors import CORSMiddleware # UPDATED


#############################################################################################
###################ROUTERS###################################################################


from fts import router as fts_router 
from report import router as report_router



############################################################################################################################################################################################################################################
#Import files#
#############################################################################################################################################################################################################################################


model = SentenceTransformer(
    "FremyCompany/BioLORD-2023",
    prompts={"retrieval": "Represent this sentence for searching relevant passages: "},)


DATA_DIR = Path(__file__).resolve().parent.parent / "db" / "embeddings"

pinsy_path = DATA_DIR / "pinsy.csv"
bepen_path = DATA_DIR / "bepen.csv"
picab_path = DATA_DIR / "picab.csv"
tieton_path = DATA_DIR / "tieton.csv"
arabidopsis_path = DATA_DIR / "arabidopsis.csv"
potra_path = DATA_DIR / "potra.csv"



def pinsy_load (): 
    pinsy_lines = pinsy_path.read_text().splitlines()
    pinsy_ID = []
    pinsy_description = []
    for line in pinsy_lines:
        id_, desc = line.split(",", 1)
        pinsy_ID.append(id_)
        pinsy_description.append(desc)
    pinsy_gene_ids_file = DATA_DIR / "pinsy-gene-ids.npy"
    pinsy_embeddings_file = DATA_DIR / "pinsy-embeddings.npy"
    if os.path.exists(pinsy_embeddings_file):
        pinsy_embeddings = numpy.load(pinsy_embeddings_file)
        pinsy_ids = list(numpy.load(pinsy_gene_ids_file, allow_pickle=True))
    else:
        print(f"Something is wrong with the pinsy file... Compute the embeddings again")
    return {
        "ID" : pinsy_ID, 
        "description" : pinsy_description, 
        "embeddings" : pinsy_embeddings,
        "ids" : pinsy_ids
    }



def potra_load(): 
    potra_lines = potra_path.read_text().splitlines()
    potra_ID = []
    potra_description = []
    for line in potra_lines:
        id_, desc = line.split(",", 1)
        potra_ID.append(id_)
        potra_description.append(desc)
    potra_gene_ids_file = DATA_DIR / "potra-gene-ids.npy"
    potra_embeddings_file = DATA_DIR / "potra-embeddings.npy"
    if os.path.exists(potra_embeddings_file):
        print("Loading embeddings from disk for potra...")
        potra_embeddings = numpy.load(potra_embeddings_file)
        potra_ids = list(numpy.load(potra_gene_ids_file, allow_pickle=True))
    else:
        print(f"Something is wrong with the potra file... Compute the embeddings again")
    return {
            "ID" : potra_ID, 
            "description" : potra_description, 
            "embeddings" : potra_embeddings, 
            "ids" : potra_ids
        }



def picab_load(): 
    picab_lines = picab_path.read_text().splitlines()
    picab_ID=[]
    picab_description = []
    for line in picab_lines:
        id_, desc = line.split(",", 1)
        picab_ID.append(id_)
        picab_description.append(desc)
    picab_gene_ids_file = DATA_DIR / "picab-gene-ids.npy"
    picab_embeddings_file = DATA_DIR / "picab-embeddings.npy"
    if os.path.exists(picab_embeddings_file):
        print("Loading embeddings from disk for picab...")
        picab_embeddings = numpy.load(picab_embeddings_file)
        picab_ids = list(numpy.load(picab_gene_ids_file, allow_pickle=True))
    else:
        print(f"Something is wrong with the picab file... Compute the embeddings again")
    return {
            "ID" : picab_ID, 
            "description" : picab_description, 
            "embeddings" : picab_embeddings, 
            "ids" : picab_ids
        }



def tieton_load(): 
    tieton_lines = tieton_path.read_text().splitlines()
    tieton_ID=[]
    tieton_description = []
    for line in tieton_lines:
        id_, desc = line.split(",", 1)
        tieton_ID.append(id_)
        tieton_description.append(desc)
    tieton_gene_ids_file = DATA_DIR / "tieton-gene-ids.npy"
    tieton_embeddings_file = DATA_DIR / "tieton-embeddings.npy"
    if os.path.exists(tieton_embeddings_file):
        print("Loading embeddings from disk for tieton...")
        tieton_embeddings = numpy.load(tieton_embeddings_file)
        tieton_ids = list(numpy.load(tieton_gene_ids_file, allow_pickle=True))
    else:
        print(f"Something is wrong with the tieton file... Compute the embeddings again")
    return {
            "ID" : tieton_ID, 
            "description" : tieton_description, 
            "embeddings" : tieton_embeddings, 
            "ids" : tieton_ids
        }


def bepen_load(): 
    bepen_lines = bepen_path.read_text().splitlines()
    bepen_ID=[]
    bepen_description = []
    for line in bepen_lines:
        id_, desc = line.split(",", 1)
        bepen_ID.append(id_)
        bepen_description.append(desc)
    bepen_gene_ids_file = DATA_DIR / "bepen-gene-ids.npy"
    bepen_embeddings_file = DATA_DIR / "bepen-embeddings.npy"
    if os.path.exists(bepen_embeddings_file):
        print("Loading embeddings from disk for bepen...")
        bepen_embeddings = numpy.load(bepen_embeddings_file)
        bepen_ids = list(numpy.load(bepen_gene_ids_file, allow_pickle=True))
    else:
        print(f"Something is wrong with the bepen file... Compute the embeddings again")
    return {
            "ID" : bepen_ID, 
            "description" : bepen_description, 
            "embeddings" : bepen_embeddings, 
            "ids" : bepen_ids
        }


def arabidopsis_load(): 
    arabidopsis_lines = arabidopsis_path.read_text().splitlines()
    arabidopsis_ID = []
    arabidopsis_description =[]
    for line in arabidopsis_lines:
        id_, desc = line.split(",", 1)
        arabidopsis_ID.append(id_)
        arabidopsis_description.append(desc)
    arabidopsis_gene_ids_file = DATA_DIR / "arabidopsis-gene-ids.npy"
    arabidopsis_embeddings_file = DATA_DIR / "arabidopsis-embeddings.npy"
    if os.path.exists(arabidopsis_embeddings_file):
        print("Loading embeddings from disk for arabidopsis...")
        arabidopsis_embeddings = numpy.load(arabidopsis_embeddings_file)
        arabidopsis_ids = list(numpy.load(arabidopsis_gene_ids_file, allow_pickle=True))
    else:
        print(f"Something is wrong with the arabidopsis file... Compute the embeddings again")
    return {
            "ID" : arabidopsis_ID, 
            "description" : arabidopsis_description, 
            "embeddings" : arabidopsis_embeddings, 
            "ids" : arabidopsis_ids
        }



############################################################################################################################################################################################################################################
#TURN INTO API#
############################################################################################################################################################################################################################################

embedding_loadings = {}

@asynccontextmanager
async def lifespan(app:FastAPI): 
    embedding_loadings["Pinsy"] = pinsy_load()
    embedding_loadings["Potra"] = potra_load()
    embedding_loadings["Picab"] = picab_load()
    embedding_loadings["Bepen"] = bepen_load()
    embedding_loadings["Tieton"] = tieton_load()
    embedding_loadings["Arabidopsis"] = arabidopsis_load()
    yield
    embedding_loadings.clear()


app= FastAPI(lifespan=lifespan, title= "Semantic search of genes")



################ Enable CORS for React frontend # by AI ###############################
app.add_middleware( 
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"], 
) 
########################################################################################




class species(str, Enum): 
    Pinsy = "Pinus Sylvestris"
    Potra = "Populus tremula"
    Picab = "Picea abies"
    Bepen = "Betula pendula"
    Tieton = "Tilia tomentosa"
    Arabidopsis = "Arabidopsis thaliana"




##################AI suggestion to mathc frontend#########################################
SPECIES_KEY_MAP = {
    species.Pinsy: "Pinsy",
    species.Potra: "Potra",
    species.Picab: "Picab",
    species.Bepen: "Bepen",
    species.Tieton: "Tieton",
    species.Arabidopsis: "Arabidopsis",
}
########################################################################################



@app.get("/Search/")
async def search(species: species, query:str, number_of_results: int = 10): 
    internal_key = SPECIES_KEY_MAP[species]                                #UPDATED
    data = embedding_loadings[internal_key]                                #species.value would be "", .name is what is on the left 
    query_embedding = model.encode_query(query)
    similarities = model.similarity(query_embedding, data["embeddings"]).squeeze()
    indices= similarities.argsort(descending=True).squeeze().tolist()

    if isinstance(indices, int):                          #UPDATED
        indices = [indices]                               #UPDATED
    results=[]

    count = min(number_of_results, len(indices))                           #UPDATED

    for i in range(count):
        index = indices[i]
        score = similarities[index].item()
        results.append({
            "Gene": data["ids"][index],
            # "Indices": embeddings[index].tolist(),
            "Similarity score": score,
            "Description": data["description"][index]
        })
    return results



###########################################################
#######ROUTER
app.include_router(fts_router)   
app.include_router(report_router)