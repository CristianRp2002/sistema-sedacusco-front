export interface LoginResponse {
  access_token: string;
  user: {
    username: string;
    nombre: string;
    rol: string;
  };
}

export interface LoginDto {
  username: string;
  password: string;
}