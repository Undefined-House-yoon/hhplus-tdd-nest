import { Module } from '@nestjs/common';
import { PointController } from './controller/point.controller';
import { DatabaseModule } from '../database/database.module';
import { PointService } from './service/point.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PointController],
  providers: [{ provide: 'IPointService', useClass: PointService }],
  exports: ['IPointService'], //  'IPointService' 다른 모듈에서도 사용할 수 있도록 내보냄
})
export class PointModule {}
