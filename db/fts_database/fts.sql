ATTACH '/home/seva/Work/New_Model/db/embeddings/Database' AS Database;

Create table pinsy_gff as 
select * from read_csv(Pinsy01.gff3, ignore_errors=true);

Create table pinsy_tsv as 
select * from read_csv(Pinsy01.tsv, ignore_errors=true);

Create table bepen_gff as 
select * from read_csv(Bepen.gff3, ignore_errors=true);

Create table bepen_tsv as 
select * from read_csv('Bepen.tsv', ignore_errors=true);

Create table picab_gff as 
select * from read_csv(Picab02.gff3, ignore_errors=true);

Create table picab_tsv as 
select * from read_csv(Picab02.tsv, ignore_errors=true);

Create table tieton_gff as 
select * from read_csv(Tieton02.gff3, ignore_errors=true);

Create table tieton_tsv as 
select * from read_csv(Tieton02.tsv, ignore_errors=true);


Create table potra_gff as 
select * from read_csv(Potra02.gff3, ignore_errors=true);

Create table potra_tsv as 
select * from read_csv(Potra02.tsv, ignore_errors=true);


--Alter tables 
update bepen_gff set column8 = string_split(string_split(column8, ';')[1], '=')[2];
ALTER TABLE bepen_gff ADD COLUMN Length INT;
UPDATE bepen_gff SET Length = column4 - column3 + 1;

update bepen_tsv set query = regexp_replace(query, '\.m.*$', '');



update picab_gff set column8 = string_split(string_split(column8, ';')[1], '=')[2];
ALTER TABLE picab_gff ADD COLUMN Length INT;
UPDATE picab_gff SET Length = column4 - column3 + 1;

update picab_tsv set id = regexp_replace(id, '\.m.*$', '');



update pinsy_gff set column8 = string_split(string_split(column8, ';')[1], '=')[2];
ALTER TABLE pinsy_gff ADD COLUMN Length INT;
UPDATE pinsy_gff SET Length = column4 - column3 + 1;

update pinsy_tsv set id = regexp_replace(id, '\.m.*$', '');



update potra_gff set column8 = string_split(string_split(column8, ';')[1], '=')[2];
ALTER TABLE potra_gff ADD COLUMN Length INT;
UPDATE potra_gff SET Length = column4 - column3 + 1;

update potra_tsv set query = string_split(query, '.')[1];





update tieton_gff set column8 = string_split(string_split(column8, ';')[1], '=')[2];
ALTER TABLE tieton_gff ADD COLUMN Length INT;
UPDATE tieton_gff SET Length = column4 - column3 + 1;

update tieton_tsv set query = string_split(query, '-')[1];

--Joins
create table bepen_middle as
FROM Database.bepen as bepen
left join lateral (
select column0 AS Contig,
column6 as "Strand", 
"Length", 
column3 as "Start", 
column4 as "End"
FROM bepen_gff
where bepen_gff.column8=bepen.ID
limit 1) 
bepen_gff ON TRUE; 

create table bepen_complete as
FROM bepen_middle
left join lateral (
select 
"PFAMs", 
"GOs", 
"KEGG_Pathway"
FROM bepen_tsv
where bepen_tsv.query=bepen_middle.ID
limit 1) 
bepen_tsv ON TRUE;




create table picab_middle as
FROM Database.picab as picab
left join lateral (
select column0 AS Chromosome,
column6 as "Strand", 
"Length", 
column3 as "Start", 
column4 as "End"
FROM picab_gff
where picab_gff.column8=picab.ID
limit 1) 
picab_gff ON TRUE; 

CREATE TABLE picab_complete AS
from picab_middle
LEFT JOIN LATERAL (
    SELECT 
        COALESCE(
            NULLIF(eggnog_pfams, 'NA'), 
            NULLIF(interpro_pfam, 'NA')
        ) AS "PFAMs",
        coalesce (
        nullif(eggnog_go, 'NA'),
        nullif (interpro_go, 'NA')
        ) as "GOs", 
    eggnog_KEGG_Pathway as KEGG_Pathway
    FROM picab_tsv
    WHERE picab_tsv.id = picab_middle.ID
    LIMIT 1
) picab_tsv ON TRUE;





create table pinsy_middle as
FROM Database.pinsy as pinsy
left join lateral (
select column0 AS Chromosome,
column6 as "Strand", 
"Length", 
column3 as "Start", 
column4 as "End"
FROM pinsy_gff
where pinsy_gff.column8 = pinsy.ID
limit 1) 
pinsy_gff ON TRUE; 

CREATE TABLE pinsy_complete AS
from pinsy_middle
LEFT JOIN LATERAL (
    SELECT 
        COALESCE(
            NULLIF(eggnog_pfams, 'NA'), 
            NULLIF(interpro_pfam, 'NA')
        ) AS "PFAMs",
        coalesce (
        nullif(eggnog_go, 'NA'),
        nullif (interpro_go, 'NA')
        ) as "GOs", 
    eggnog_KEGG_Pathway as KEGG_Pathway
    FROM pinsy_tsv
    WHERE pinsy_tsv.id = pinsy_middle.ID
    LIMIT 1
) pinsy_tsv ON TRUE;






create table potra_middle as
FROM Database.potra as potra
left join lateral (
select column0 AS Chromosome,
column6 as "Strand", 
"Length", 
column3 as "Start", 
column4 as "End"
FROM potra_gff
where potra_gff.column8=potra.ID
limit 1) 
potra_gff ON TRUE; 

create table potra_complete as
FROM potra_middle
left join lateral (
select 
"PFAMs", 
"GOs", 
"KEGG_Pathway"
FROM potra_tsv
where potra_tsv.query=potra_middle.ID
limit 1) 
potra_tsv ON TRUE;




create table tieton_middle as
FROM Database.tieton as tieton
left join lateral (
select column0 AS Chromosome,
column6 as "Strand", 
"Length", 
column3 as "Start", 
column4 as "End"
FROM tieton_gff
where tieton_gff.column8 = tieton.ID
limit 1) 
tieton_gff ON TRUE; 

create table tieton_complete as
FROM tieton_middle
left join lateral (
select 
"PFAMs", 
"GOs", 
"KEGG_Pathway"
FROM tieton_tsv
where tieton_tsv.query = tieton_middle.ID
limit 1) 
tieton_tsv ON TRUE;


--Cleans 
update bepen_complete set PFAMs = CASE WHEN PFAMs = '-' then NULL else PFAMs END; 
update bepen_complete set GOs = CASE WHEN GOs = '-' then NULL else GOs END; 
update bepen_complete set KEGG_Pathway = CASE WHEN KEGG_Pathway = '-' then NULL else KEGG_Pathway END; 

alter TABLE picab_complete rename eggnog_description to Description;
update picab_complete set KEGG_Pathway = CASE WHEN KEGG_Pathway = 'NA' then NULL else KEGG_Pathway END; 

alter TABLE pinsy_complete rename eggnog_description to Description;
update pinsy_complete set KEGG_Pathway = CASE WHEN KEGG_Pathway = 'NA' then NULL else KEGG_Pathway END; 

update potra_complete set PFAMs = CASE WHEN PFAMs = '-' then NULL else PFAMs END; 
update potra_complete set GOs = CASE WHEN GOs = '-' then NULL else GOs END; 
update potra_complete set KEGG_Pathway = CASE WHEN KEGG_Pathway = '-' then NULL else KEGG_Pathway END; 

update tieton_complete set PFAMs = CASE WHEN PFAMs = '-' then NULL else PFAMs END; 
update tieton_complete set GOs = CASE WHEN GOs = '-' then NULL else GOs END; 
update tieton_complete set KEGG_Pathway = CASE WHEN KEGG_Pathway = '-' then NULL else KEGG_Pathway END; 

--Drops 
drop table bepen_gff;
drop table bepen_tsv;
drop table bepen_middle;

drop table picab_gff;
drop table picab_middle;
drop table picab_tsv;

drop table pinsy_gff;
drop table pinsy_middle;
drop table pinsy_tsv;


drop table potra_gff;
drop table potra_tsv;
drop table potra_middle;


drop table tieton_gff;
drop table tieton_tsv;
drop table tieton_middle;

copy bepen_complete to 'bepen_fts.csv'(HEADER FALSE);
copy potra_complete to 'potra_fts.csv'(HEADER FALSE);
copy pinsy_complete to 'pinsy_fts.csv'(HEADER FALSE);
copy picab_complete to 'picab_fts.csv'(HEADER FALSE);
copy tieton_complete to 'tieton_fts.csv'(HEADER FALSE);
