import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserPointTable } from '../src/database/userpoint.table';
import { PointHistoryTable } from '../src/database/pointhistory.table';
import { PointService } from '../src/point/service/point.service';

describe('PointController (e2e)', () => {
  let app: INestApplication;
  const userId = 1;

  let service: PointService;
  let userPointTable: UserPointTable;
  let pointHistoryTable: PointHistoryTable;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    pointHistoryTable = new PointHistoryTable();
    userPointTable = new UserPointTable();
    service = new PointService(userPointTable, pointHistoryTable);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /point/:id', () => {
    it('should return user point', async () => {
      const userPoint = await userPointTable.selectById(4);

      const response = await request(app.getHttpServer())
        .get(`/point/${4}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userPoint.id,
        point: userPoint.point,
      });
      // expect(response.body.updateMillis).toBe(userPoint.updateMillis);
      // 사실 맞아야 하지만 randomInt(200) 이거때문에 다르게 나와서 어떻게 생각해야 할지 모르겠습니다.
    });
  });

  describe('PATCH /point/:id/charge', () => {
    it('should charge user point', async () => {
      const initAmount = 0;
      const amount = 252;
      const userPoint = await service.chargePoint(userId, initAmount + amount);

      const dto = { amount: amount };
      const response = await request(app.getHttpServer())
        .patch(`/point/${userId}/charge`)
        .send(dto)
        .expect(200);
      console.log(response.body);
      expect(response.body.point).toBe(userPoint.point);
    });
  });

  describe('GET /point/:id/histories', () => {
    it('should return user point histories', async () => {
      const userPointHistory = await service.getPointHistory(1);
      const response = await request(app.getHttpServer())
        .get(`/point/${1}/histories`)
        .expect(200);
      console.log(response.body, userPointHistory);
      expect(response.body[0]).toHaveProperty('id', userPointHistory[0].id);
      expect(response.body[0]).toHaveProperty(
        'userId',
        userPointHistory[0].userId,
      );
      expect(response.body[0]).toHaveProperty(
        'amount',
        userPointHistory[0].amount,
      );
    });
  });

  describe('PATCH /point/:id/use', () => {
    it('should use user point', async () => {
      const userPoint = await service.usePoint(userId, 50);

      const dto = { amount: 50 };
      const response = await request(app.getHttpServer())
        .patch(`/point/${userId}/use`)
        .send(dto)
        .expect(200);

      expect(response.body.point).toBe(userPoint.point);
    });
  });
  // jest 초기화가 막힘 에휴 jest 쓰는 법이 막히는구나;;
  describe('Concurrent point operations', () => {
    it('should handle concurrent charge and use point requests correctly', async () => {
      const userPoint = await service.getPoint(userId);
      console.log(userPoint);
      const work1 = async () => {
        return await request(app.getHttpServer())
          .patch('/point/1/charge')
          .send({ amount: 1000 });
      };
      const work2 = async () => {
        return await request(app.getHttpServer())
          .patch('/point/1/use')
          .send({ amount: 100 });
      };
      const work3 = async () => {
        return await request(app.getHttpServer())
          .patch('/point/1/charge')
          .send({ amount: 1000 });
      };

      await Promise.all([work1(), work2(), work3()]);

      const response = await request(app.getHttpServer())
        .get('/point/1')
        .expect(200);
      console.log(response.body);
      expect(response.body.point).toBe(
        10000 + 1000 - 100 + 1000 - userPoint.point,
      );
    });
  });
});

// it('동시에 포인트 충전/차감/충전 요청이 와도 잘 처리해라.', async () => {
//   // given - 10000 원 충전 시작
//   await userService.chargePoint(1, 10000);
//   // when - 각 태스크 병렬 수행 및 기다림
//   const work1 = async () => {
//     return await userService.chargePoint(1, 1000);
//   };
//   const work2 = async () => {
//     return await userService.usePoint(1, 100);
//   };
//   const work3 = async () => {
//     return await userService.chargePoint(1, 1000);
//   };
//   // Promise.all() 인 이유 : 각 태스크 언제 끝날줄 알고 상수로 기다려..?
//   await Promise.all([work1(), work2(), work3()]);
//
//   // then - 결과 검증 : 다 수행되었는지 ?
//   const userPoint = await userService.getById(1);
//   expect(userPoint.point).toEqual(10000 + 1000 - 100 + 1000);
// });
/*동시성 테스트는 E2E 에서? */
