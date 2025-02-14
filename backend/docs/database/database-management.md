# Database Management

Here are the docs to manage the DB from Turso CLI:

https://docs.turso.tech/cli/db/shell

## CREATE DUMP

To make a dump run:

```shell
turso db list # to see the <database-name> 
turso db shell <database-name> .dump > dump.sql
```

## EMPTY DB

To delete all tables in the DB (in case of a Table change for example) run:

```shell
turso db shell <database-name> "SELECT 'DROP TABLE ' || name || ';' FROM sqlite_master WHERE type = 'table';" > drop_tables.sql
turso db shell <database-name> < drop_tables.sql
```

## RESTORE DUMP

Create a brand new DB in Turso or delete the tables from a existing one.
Then import the `dump.sql` file:

```shell
turso db shell <database-name> < dump.sql
```    
