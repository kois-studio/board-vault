// wrapper type
export type ResponseDto<T> = {
    statusOk: boolean
    message: string
    code: number
    data: T
}
