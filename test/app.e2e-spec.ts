import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserPointTable } from '../src/database/userpoint.table';
import { PointHistoryTable } from '../src/database/pointhistory.table';
import { randomInt } from 'crypto';

describe('PointController (e2e)', () => {
  let app: INestApplication;
  const userId = 1;

  let userPointTable: UserPointTable;
  let pointHistoryTable: PointHistoryTable;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userPointTable = moduleFixture.get<UserPointTable>(UserPointTable);
    pointHistoryTable = moduleFixture.get<PointHistoryTable>(PointHistoryTable);

    await app.init();
  });

  beforeEach(async () => {
    userPointTable['table'].clear();
    pointHistoryTable['table'].length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /point/:id', () => {
    it('should return user point', async () => {
      const response = await request(app.getHttpServer())
        .get(`/point/${userId}`)
        .expect(200);
      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('point');
      expect(response.body).toHaveProperty('updateMillis');
    });
  });

  describe('PATCH /point/:id/charge', () => {
    it('should charge user point', async () => {
      const amount = 1000;

      const dto = { amount: amount };
      const response = await request(app.getHttpServer())
        .patch(`/point/${userId}/charge`)
        .send(dto)
        .expect(200);
      console.log(response.body);
      expect(response.body.point).toBeGreaterThanOrEqual(amount);
    });
  });

  describe('GET /point/:id/histories', () => {
    it('should return user point histories', async () => {
      for (const _ of Array(4)) {
        const dto = { amount: randomInt(1000) };
        await request(app.getHttpServer())
          .patch(`/point/${userId}/charge`)
          .send(dto);
      }

      const response = await request(app.getHttpServer())
        .get(`/point/${userId}/histories`)
        .expect(200);
      expect(response.body.length).toBeGreaterThanOrEqual(4);

      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('userId');
      expect(response.body[0]).toHaveProperty('amount');
      expect(response.body[0]).toHaveProperty('type');
      expect(response.body[0]).toHaveProperty('timeMillis');
    });
  });

  describe('PATCH /point/:id/use', () => {
    it('should use user point', async () => {
      const dto = { amount: 1000 };
      await request(app.getHttpServer())
        .patch(`/point/${userId}/charge`)
        .send(dto);
      const response = await request(app.getHttpServer())
        .patch(`/point/${userId}/use`)
        .send(dto)
        .expect(200);
      expect(response.body.point).toBeGreaterThanOrEqual(0);
    });

    it('should use user point', async () => {
      const dto = { amount: 100000 };
      const response = await request(app.getHttpServer())
        .patch(`/point/${userId}/use`)
        .send(dto)
        .expect(400);
      expect(response.body.message).toBe('Insufficient balance');
    });
  });

  // jest 초기화가 막힘 에휴 jest 쓰는 법이 막히는구나;;
  describe('Concurrent point operations', () => {
    it('should handle concurrent charge and use point requests correctly', async () => {
      const work1 = () =>
        request(app.getHttpServer())
          .patch(`/point/${userId}/charge`)
          .send({ amount: 1000 });

      const work2 = () =>
        request(app.getHttpServer())
          .patch(`/point/${userId}/use`)
          .send({ amount: 100 });

      const work3 = () =>
        request(app.getHttpServer())
          .patch(`/point/${userId}/charge`)
          .send({ amount: 1000 });

      await Promise.all([work1(), work2(), work3()]);

      const response = await request(app.getHttpServer())
        .get('/point/1')
        .expect(200);
      console.log(response.body);
      expect(response.body.point).toBe(1000 - 100 + 1000);
    });
  });
});
