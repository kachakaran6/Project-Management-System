declare module 'winston-mongodb' {
  import { TransportInstance } from 'winston';
  export interface MongoDBTransportInstance extends TransportInstance {
    new (options: any): MongoDBTransportInstance;
  }
}
