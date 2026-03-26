// interfaces/IUserRepository.ts
import { User, Register, Login } from '../../types/user.js';

export interface IUserRepository {
  /**
   * Inscription d'un nouvel utilisateur
   * @param userData - Données d'inscription de l'utilisateur
   * @returns Promise avec l'utilisateur créé, le token et un message
   */
  register(userData: Register): Promise<{
    user: Omit<User, 'password'>;
    token: string;
    message: string;
  }>;

  /**
   * Connexion d'un utilisateur existant
   * @param loginData - Données de connexion (email et mot de passe)
   * @returns Promise avec l'utilisateur connecté, le token et un message
   */
  login(loginData: Login): Promise<{
    user: Omit<User, 'password'>;
    token: string;
    message: string;
  }>;

  /**
   * Récupération de tous les utilisateurs avec pagination
   * @param options - Options de pagination et de filtrage
   * @returns Promise avec la liste des utilisateurs et les métadonnées de pagination
   */
  getAllUsers(options?: {
    page?: number;
    limit?: number;
    cursor?: any;
    findOptions?: any;
  }): Promise<{
    data: Omit<User, 'password'>[];
    total?: number;
    page?: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    paginated: boolean;
    message: string;
  }>;
}