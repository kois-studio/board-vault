export interface TursoResponse {
    columns: string[]
    columnTypes: string[]
    rows: Array<[number, string, string, string, string, string]>
    rowsAffected: number
    lastInsertRowid: number | null
}
