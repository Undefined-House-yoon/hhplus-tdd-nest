import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PointModule } from './point/point.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeormConfig } from './configs/typeorm.config';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [PointModule, DatabaseModule, TypeOrmModule.forRoot(typeormConfig)],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
