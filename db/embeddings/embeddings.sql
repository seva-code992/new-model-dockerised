--Load the tables

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

create table pinsy_genes as
select column2, column8 from pinsy_gff where column2 = 'gene' ; 

create table pinsy_id as select 
string_split(string_split(column8, ';')[1], '=')[2] as "ID"
from pinsy_genes; 

--Verify
--select * from pinsy_id where ID not like 'PS_%' ;

update pinsy_tsv set id = string_split(id, '.')[1];

Create table pinsy as select
a.*, b.eggnog_description
from  pinsy_id a
join pinsy_tsv b on a.ID = b.id;

--Verify: pinsy and pinsy_tsv should have the same rows. 

--eggnog_description NULL instead of NA
update pinsy set eggnog_description = CASE WHEN eggnog_description = 'NA' then NULL else eggnog_description END; 






create table bepen_genes as
select column2, column8 from bepen_gff where column2 = 'gene' ; 

create table bepen_id as select 
string_split(string_split(column8, ';')[1], '=')[2] as "ID"
from bepen_genes
OFFSET 1; 

--Verify
--select * from bepen_id where ID not like 'Bpev%' ;


update bepen_tsv set query = regexp_replace(query, '\.[^.]*$', '');

Create table bepen as select
a.*, b.Description
from  bepen_id a
join bepen_tsv b on a.ID = b.query;

--Verify: bepen 55 less rows than bepen_tsv

update bepen set Description = CASE WHEN Description = '-' then NULL else Description END; 







create table picab_genes as
select column2, column8 from picab_gff where column2 = 'gene' ; 

create table picab_id as select 
string_split(string_split(column8, ';')[1], '=')[2] as "ID"
from picab_genes; 

--Verify
--select * from picab_id where ID not like 'PA_%' ;

update picab_tsv set id = string_split(id, '.')[1];

Create table picab as select
a.*, b.eggnog_description
from  picab_id a
join picab_tsv b on a.ID = b.id;

--Verify: OK

--eggnog_description NULL instead of NA
update picab set eggnog_description = CASE WHEN eggnog_description = 'NA' then NULL else eggnog_description END; 





create table tieton_genes as
select column2, column8 from tieton_gff where column2 = 'gene' ; 

create table tieton_id as select 
string_split(string_split(column8, ';')[1], '=')[2] as "ID"
from tieton_genes; 

--Verify
--select * from tieton_id where ID not like 'FUN_%' ;

update tieton_tsv set query = string_split(query, '-')[1];

Create table tieton as select
a.*, b.Description
from  tieton_id a
join tieton_tsv b on a.ID = b.query;

--Verify: Same rows 

--Description NULL instead of -
update tieton set Description = CASE WHEN Description = '-' then NULL else Description END; 


--Remove the genes that don't have annotations

Create table middle_pinsy as
select * from pinsy where eggnog_description not null; -- From 83.8k to 62.1k 


Create table middle_bepen as
select * from bepen where Description not null; --1.5k less 

Create table middle_picab as
select * from picab where eggnog_description not null; --3.4k less


Create table middle_tieton as
select * from tieton where Description not null; --2.8k less

Drop table pinsy; 
Drop table bepen; 
Drop table picab;
Drop table tieton;

--Check for dublicates and remove them

--select distinct ID from middle_pinsy; --38,120 unique
--select distinct ID from middle_picab; --32,225 unique 
--select distinct ID from middle_bepen; -- 20,619 unique 
--select distinct ID from middle_tieton; --25,291 unique 


create table pinsy_ids as
select distinct ID from middle_pinsy;
create table picab_ids as
select distinct ID from middle_picab;
create table tieton_ids as
select distinct ID from middle_tieton;
create table bepen_ids as
select distinct ID from middle_bepen;

Create table pinsy as 
select a.*, b.eggnog_description 
from pinsy_ids a 
left join lateral(
select eggnog_description 
from middle_pinsy b 
where b.ID = a.ID 
LIMIT 1 
) b on true; 

Create table picab as 
select a.*, b.eggnog_description 
from picab_ids a 
left join lateral(
select eggnog_description 
from middle_picab b 
where b.ID = a.ID 
LIMIT 1 
) b on true; 

Create table tieton as 
select a.*, b.Description 
from tieton_ids a 
left join lateral(
select Description
from middle_tieton b 
where b.ID = a.ID 
LIMIT 1 
) b on true; 

Create table bepen as 
select a.*, b.Description 
from bepen_ids a 
left join lateral(
select Description
from middle_bepen b 
where b.ID = a.ID 
LIMIT 1 
) b on true; 

--Clean database
drop table pinsy_genes;
drop table pinsy_gff;
drop table pinsy_tsv; 
drop table pinsy_id; 

drop table bepen_genes;
drop table bepen_gff;
drop table bepen_tsv; 
drop table bepen_id; 

drop table picab_genes;
drop table picab_gff;
drop table picab_tsv; 
drop table picab_id; 

drop table tieton_genes;
drop table tieton_gff;
drop table tieton_tsv; 
drop table tieton_id; 

drop table middle_pinsy;
drop table middle_picab;
drop table middle_tieton;
drop table middle_bepen;

drop table pinsy_ids; 
drop table picab_ids; 
drop table tieton_ids; 
drop table bepen_ids; 

--Export tables as csvs
COPY pinsy to 'pinsy.csv' (HEADER FALSE);
Copy bepen to 'bepen.csv' (HEADER FALSE); 
copy picab to 'picab.csv' (HEADER FALSE);
copy tieton to 'tieton.csv'(HEADER FALSE);

--For arabidopsis and potra 


Create table potra_gff as select * from read_csv(Potra02.gff3, ignore_errors=true); 

Create table potra_tsv as select * from read_csv(Potra02.tsv, ignore_errors=true);  

Create table araport as 
select * from read_csv(TAIR10_araport11_sorted.gff3, ignore_errors=true);

Create table tair_gff as 
select * from read_csv(TAIR10_GFF3_genes_sorted.gff3, ignore_errors=true);


--New files: 
Create table ara_tsv as 
select * from read_csv(Arabidopsis.tsv, ignore_errors=true);


--Arabidopsis

create table arabidopsis_genes as
select column2, column8, column8 from araport where column2 = 'gene' ; 

create table abidopsis_araport as select 
string_split(string_split(column8, ';')[1], '=')[2] as "ID",
CASE WHEN string_split(column8_1, ';')[4] like 'description=%' then string_split(string_split(column8_1, ';')[4], '=')[2] else NULL END as "Description",
from arabidopsis_genes; 


update abidopsis_araport set Description = trim(string_split(Description, '[')[1]);

create table tair_genes as
select column2, column8 from tair_gff where column2 = 'gene' ; 

create table tair_id as
select string_split(string_split(column8, ';')[1], '=')[2] as "ID"
from tair_genes;

Create table arabidopsis as select
a.*, b.Description
from  tair_id a
join abidopsis_araport b on a.ID = b.ID;


create table middle_arabidopsis as 
select * from arabidopsis where Description  not null; 

drop table arabidopsis; 

create table middle_ara_tsv as 
select Model_name as "ID", 
Short_description as "description"
from ara_tsv where Short_description  not null; 

drop table ara_tsv;

Create table middle_middle_arabidopsis as
SELECT * FROM middle_arabidopsis
UNION ALL
SELECT * FROM middle_ara_tsv;


create table arabidopsis_ids as 
select distinct ID from middle_middle_arabidopsis;

Create table arabidopsis as 
select a.*, b.Description 
from arabidopsis_ids a 
left join lateral(
select Description 
from middle_middle_arabidopsis b 
where b.ID = a.ID 
LIMIT 1 
) b on true; 

drop table middle_arabidopsis;
drop table middle_ara_tsv;
drop table middle_middle_arabidopsis;
drop table arabidopsis_ids;
drop table abidopsis_araport; 
drop table arabidopsis_genes;
drop table tair_gff; 
drop table araport;
drop table tair_genes;
drop table tair_id;




--potra 
Create table potra_modified as (
  with
    gff as (
      select
        regexp_extract(attributes, 'ID=([^;]+)', 1) AS feature_id,
        regexp_extract(attributes, 'Parent=([^;]+)', 1) AS parent_id,
        *
      from
        read_csv(
          'https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Potra02_240916_genes_all_sorted.gff3.gz',
          header = false,
          delim = '\t',
          comment = '#',
          columns = {
            'seqid': 'VARCHAR',
            'source': 'VARCHAR',
            'feature_type': 'VARCHAR',
            'start': 'BIGINT',
            'end': 'BIGINT',
            'score': 'VARCHAR',
            'strand': 'VARCHAR',
            'phase': 'VARCHAR',
            'attributes': 'VARCHAR'
          },
          auto_detect = false,
          nullstr = '.'
        )
      where
        lower(feature_type) = 'mrna'
        AND source = 'maker'
    ),
    eggnog_annotations as (
      select
        query as feature_id,
        Description as description,
        score,
        Preferred_name as gene_name
      from
        read_csv(
          'https://north-1.cloud.snic.se:8080/swift/v1/AUTH_d9d5ac98cb2b4a3091b60040077e8efc/plantgenie-knowledge/Potra02_240916_eggnog_annotation.tsv.gz',
          comment = '#',
          nullstr = '-'
        )
      QUALIFY
        row_number() OVER (
          PARTITION BY
            feature_id
          ORDER BY
            score DESC
        ) = 1
    )
  select
    gff.parent_id as gene_id,
    gene_name,
    description
  from
    gff
    INNER JOIN eggnog_annotations ON (eggnog_annotations.feature_id = gff.feature_id)
);



create table middle_potra as 
select gene_id as "ID", 
description from potra_modified where description not null;

create table potra_ids as
select distinct ID from middle_potra; 

Create table potra as 
select a.*, b.description 
from potra_ids a 
left join lateral(
select description 
from middle_potra b 
where b.ID = a.ID 
LIMIT 1 
) b on true; 


drop table middle_potra;
drop table potra_modified;
drop table potra_ids;
drop table potra_gff;
drop table potra_tsv;


copy arabidopsis to 'arabidopsis.csv'(HEADER FALSE);
copy potra to 'potra.csv'(HEADER FALSE);