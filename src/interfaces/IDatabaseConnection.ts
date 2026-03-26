// interfaces/IRepository.ts
export interface IDatabaseConnection {
    connect(): Promise<boolean>;
    disconnect(): Promise<void>;
    isConnected(): Promise<boolean>;
    getClient(): any;
    getProvider(): string;
  }
  