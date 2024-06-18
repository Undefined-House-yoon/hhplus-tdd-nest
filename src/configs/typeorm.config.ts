import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeormConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: 'user_point.db',
  autoLoadEntities: true,
  synchronize: true,
  logging: true,
  dropSchema: false,
};
