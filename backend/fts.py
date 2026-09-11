from pathlib import Path
from enum import Enum
import csv
from fastapi import APIRouter, Query

DATA_DIR = Path(__file__).resolve().parent.parent / "db" / "fts_database"

class SpeciesEnum(str, Enum): 
    Pinsy = "Pinus Sylvestris"
    Potra = "Populus tremula"
    Picab = "Picea abies"
    Bepen = "Betula pendula"
    Tieton = "Tilia tomentosa"

SPECIES_FILE_MAP = {
    SpeciesEnum.Pinsy: DATA_DIR / "pinsy_fts.csv",
    SpeciesEnum.Potra: DATA_DIR / "potra_fts.csv",
    SpeciesEnum.Picab: DATA_DIR / "picab_fts.csv",
    SpeciesEnum.Bepen: DATA_DIR / "bepen_fts.csv",
    SpeciesEnum.Tieton: DATA_DIR / "tieton_fts.csv",
}

data_load: dict[str, list[dict]] = {}

def load_csv_data(file_path: Path) -> list[dict]:
    """Generic CSV loader returning a list of record dictionaries."""
    if not file_path.exists():
        return []
    records = []
    with open(file_path, mode="r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) < 10:
                continue  # Skip malformed lines
            records.append({
                "Gene": row[0],
                "Description": row[1],
                "Chromosome": row[2] if row[2] else None,
                "Strand": row[3] if row[3] else None,
                "Length": row[4] if row[4] else None,
                "Start": row[5] if row[5] else None,
                "End": row[6] if row[6] else None,
                "Pfams": row[7] if row[7] else None,
                "GOs": row[8] if row[8] else None,
                "KEGG": row[9] if row[9] else None,
            })
    return records

def get_species_data(species_value: str) -> list[dict]:
    """Lazy loader to ensure CSV files are loaded into memory when requested."""
    if species_value not in data_load or not data_load[species_value]:
        for enum_item, path in SPECIES_FILE_MAP.items():
            if enum_item.value == species_value:
                data_load[species_value] = load_csv_data(path)
                break
    return data_load.get(species_value, [])

router = APIRouter(prefix="/FtsSearch", tags=["Full Text Search"])

@router.get("/GeneSearch")
def fts_search(
    species: SpeciesEnum, 
    query: str = Query("", description="Term to search in Gene ID or Description"), 
    number_of_results: int = 10
):
    dataset = get_species_data(species.value)

    query_lower = query.strip().lower()
    if query_lower:
        terms = [t for t in query_lower.replace(",", " ").split() if t]
        
        results = [
            item for item in dataset 
            if any(term in item["Gene"].lower() or term in item["Description"].lower() for term in terms)
        ]
    else:
        results = dataset
    return results[:number_of_results] if results else []