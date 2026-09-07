import httpx
import gzip
import csv
from pathlib import Path



############################################################################################################################################################################################################################################
#Download the GFF files#
############################################################################################################################################################################################################################################

#gURL as in URL for gff files
gURL_bepen = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Bepen_v1p2_coge_sorted.gff3.gz"
gURL_picab = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Picab02_230926_at01_all_sorted.gff3.gz"
gURL_pinsy = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Pinsy01_240308_at01_all_sorted.gff3.gz"
gURL_potra = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Potra02_240916_genes_all_sorted.gff3.gz"
gURL_tieton = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Tieton02_original_sorted.gff3.gz"

tairURL_gff = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/TAIR10_GFF3_genes_sorted.gff3.gz"
tairURL_araport = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/TAIR10_araport11_sorted.gff3.gz"


bepen_gff = Path(__file__).resolve().parent / "Bepen.gff3"
picab_gff = Path(__file__).resolve().parent / "Picab02.gff3"
pinsy_gff = Path(__file__).resolve().parent / "Pinsy01.gff3"
potra_gff = Path(__file__).resolve().parent / "Potra02.gff3"
tieton_gff = Path(__file__).resolve().parent / "Tieton02.gff3"
tair_gff = Path(__file__).resolve().parent / "TAIR10_GFF3_genes_sorted.gff3"
araport_gff = Path(__file__).resolve().parent / "TAIR10_araport11_sorted.gff3"



if not bepen_gff.exists():
    response = httpx.get(gURL_bepen, follow_redirects=True)
    content = gzip.decompress(response.content)
    bepen_gff.write_bytes(content)

if not picab_gff.exists():
    response = httpx.get(gURL_picab, follow_redirects=True)
    content = gzip.decompress(response.content)
    picab_gff.write_bytes(content)

if not pinsy_gff.exists():
    response = httpx.get(gURL_pinsy, follow_redirects=True)
    content = gzip.decompress(response.content)
    pinsy_gff.write_bytes(content)

if not potra_gff.exists():
    response = httpx.get(gURL_potra, follow_redirects=True)
    content = gzip.decompress(response.content)
    potra_gff.write_bytes(content)

if not tieton_gff.exists():
    response = httpx.get(gURL_tieton, follow_redirects=True)
    content = gzip.decompress(response.content)
    tieton_gff.write_bytes(content)

if not tair_gff.exists():
    response = httpx.get(tairURL_gff, follow_redirects=True)
    content = gzip.decompress(response.content)
    tair_gff.write_bytes(content)


if not araport_gff.exists():
    response = httpx.get(tairURL_araport, follow_redirects=True)
    content = gzip.decompress(response.content)
    araport_gff.write_bytes(content)

print("\n\n\nDownloaded Bepen.gff3, Picab02.gff3, Pinsy01.gff3, Potra02.gff3, Tieton02.gff3, TAIR10_GFF3_genes_sorted.gff3 and TAIR10_araport11_sorted.gff3 successfully. Proceeding... \n\n\n")

############################################################################################################################################################################################################################################
#Download the tsv files#
############################################################################################################################################################################################################################################


#tURL as in URL for tsv files
tURL_bepen = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Bepen_v1p2_eggnog_annotation.tsv.gz"
tURL_picab = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Picab02_230926_at01_longest_representative_annotations_merged_sorted_non_redundant_panthers.tsv.gz"
tURL_pinsy = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Pinsy01_240308_at01_longest_representative_annotations_merged_sorted_non_redundant_panthers.tsv.gz"
tURL_potra = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Potra02_240916_eggnog_annotation.tsv.gz"
tURL_tieton = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Tieton_v2p0_eggnog_annotation.tsv.gz"





bepen_tsv = Path(__file__).resolve().parent / "Bepen.tsv"
picab_tsv = Path(__file__).resolve().parent / "Picab02.tsv"
pinsy_tsv = Path(__file__).resolve().parent / "Pinsy01.tsv"
potra_tsv = Path(__file__).resolve().parent / "Potra02.tsv"
tieton_tsv = Path(__file__).resolve().parent / "Tieton02.tsv"




if not bepen_tsv.exists():
    response = httpx.get(tURL_bepen, follow_redirects=True)
    content = gzip.decompress(response.content)
    bepen_tsv.write_bytes(content)

if not picab_tsv.exists():
    response = httpx.get(tURL_picab, follow_redirects=True)
    content = gzip.decompress(response.content)
    picab_tsv.write_bytes(content)

if not pinsy_tsv.exists():
    response = httpx.get(tURL_pinsy, follow_redirects=True)
    content = gzip.decompress(response.content)
    pinsy_tsv.write_bytes(content)

if not potra_tsv.exists():
    response = httpx.get(tURL_potra, follow_redirects=True)
    content = gzip.decompress(response.content)
    potra_tsv.write_bytes(content)

if not tieton_tsv.exists():
    response = httpx.get(tURL_tieton, follow_redirects=True)
    content = gzip.decompress(response.content)
    tieton_tsv.write_bytes(content)


#Tables will be modified with duckdb after this.


############################################################################################################################################################################################################################################
#Download the arabidopsis.tsv most recent file#
############################################################################################################################################################################################################################################

arabidopsis_URL = "https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/TAIR10_functional_descriptions"

arabidopsis_tsv = Path(__file__).resolve().parent / "Arabidopsis.tsv" 


if not arabidopsis_tsv.exists():
    response = httpx.get(arabidopsis_URL, follow_redirects=True)
    arabidopsis_tsv.write_bytes(response.content)



print("\n\n\nDownloaded Bepen.tsv, Picab02.tsv, Pinsy01.tsv, Potra02.tsv, Tieton02.tsv, and Arabidopsis.tsv successfully. File preparation completed. \n\n")
print("Now run: duckdb database.db -f export_modified_tables.sql")
print("\nNote: After you run the sql script to compute the embeddings for each species run the respective <species>_embeddings.py\n\n\n")
