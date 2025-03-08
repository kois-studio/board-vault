# database.service.md

The DatabaseService exposes the methods to interact with the SQLite database.
Each endpoint will return a `ResultSet`object that contains a structure as:

```typescript
interface TursoResponse {
    columns: string[]
    columnTypes: string[]
    rows: Array<[number, string, string, string, string, string]>
    rowsAffected: number
    lastInsertRowid: number | null
}
```

The consumers of the service will be the ones responsible for handling the parsing of the data, as they know the structure of the data they are working with.
