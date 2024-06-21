import { Module } from '@nestjs/common';
import { PointController } from './controller/point.controller';
import { DatabaseModule } from 'src/database/database.module';
import { PointService } from './service/point.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PointController],
  providers: [{ provide: 'IPointService', useClass: PointService }],
})
export class PointModule {}
