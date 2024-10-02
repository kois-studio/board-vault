import { UserType } from '../types/user.type'

// wrapper type
export type ResponseDto<T> = {
    statusOk: boolean
    message: string
    code: number
    data: T
}

export type ResponseGetUsers = ResponseDto<UserType[]>
export type ResponseGetUser = ResponseDto<UserType>
