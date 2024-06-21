import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PointService } from '../src/point/service/point.service';
import {
  PointHistory,
  TransactionType,
  UserPoint,
} from '../src/point/model/point.model';

// crypto 모듈의 randomInt 함수를 모킹하여 항상 100을 반환하도록 설정
jest.mock('crypto', () => {
  const actualCrypto = jest.requireActual('crypto');
  return {
    ...actualCrypto,
    randomInt: jest.fn().mockReturnValue(0),
  };
});

describe('AppController (e2e)', () => {
  let app: INestApplication;
  const pointService = {
    getPoint: jest.fn(),
    getPointHistory: jest.fn(),
    chargePoint: jest.fn(),
    usePoint: jest.fn(),
  };
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PointService)
      .useValue(pointService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1000); // Date.now()를 모킹하여 항상 1000 반환
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /point/:id', () => {
    it('should return user point', async () => {
      const result: UserPoint = { id: 1, point: 0, updateMillis: Date.now() };
      pointService.getPoint.mockResolvedValue(result);

      const response = await request(app.getHttpServer())
        .get('/point/1')
        .expect(200);

      expect(response.body).toMatchObject({
        id: result.id,
        point: result.point,
      });
    });
  });

  describe('PATCH /point/:id/charge', () => {
    it('should charge user point', async () => {
      const result: UserPoint = { id: 1, point: 50, updateMillis: Date.now() };
      const dto = { amount: 50 };
      pointService.chargePoint.mockResolvedValue(result);

      return request(app.getHttpServer())
        .patch('/point/1/charge')
        .send(dto)
        .expect(200)
        .expect(result);
    });
  });

  describe('GET /point/:id/histories', () => {
    it('should return user point histories', async () => {
      const result: PointHistory[] = [
        {
          id: 1,
          userId: 1,
          amount: 50,
          type: TransactionType.CHARGE,
          timeMillis: Date.now(),
        },
      ];
      pointService.getPointHistory.mockResolvedValue(result);

      return request(app.getHttpServer())
        .get('/point/1/histories')
        .expect(200)
        .expect(result);
    });
  });

  describe('PATCH /point/:id/use', () => {
    it('should use user point', async () => {
      const result: UserPoint = { id: 1, point: 0, updateMillis: Date.now() };
      const dto = { amount: 50 };
      pointService.usePoint.mockResolvedValue(result);

      return request(app.getHttpServer())
        .patch('/point/1/use')
        .send(dto)
        .expect(200)
        .expect(result);
    });
  });
});
