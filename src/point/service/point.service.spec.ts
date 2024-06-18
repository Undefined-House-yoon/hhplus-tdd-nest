import { PointService } from './point.service';
import { UserPointTable } from '../../database/userpoint.table';
import { Test, TestingModule } from '@nestjs/testing';
import { PointHistoryTable } from '../../database/pointhistory.table';

export const pointsService = {
  charge: jest.fn(),
  use: jest.fn(),
  point: jest.fn(),
  history: jest.fn(),
};
describe('포인트 서비스 테스트', () => {
  let service: PointService;
  let userPointTable: UserPointTable;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PointService, UserPointTable, PointHistoryTable],
    }).compile();

    service = module.get(PointService);
    userPointTable = module.get(UserPointTable);
  });

  describe('포인트 서비스 테스트', () => {
    // 사용자 조회 -> 충전 -> 내역 기록 -> 업데이트된 정보 반환
    test('포인트 충전 테스트', async () => {
      //사용자 조회
      const userId = 1;
      const user = { id: userId, point: 0, updateMillis: Date.now() };
      pointsService.point.mockResolvedValue(user);

      //포인트 충전
      const chargeAmount = 1000;
      user.point += chargeAmount;
      const charge = {
        id: userId,
        point: user.point,
        updateMillis: Date.now(),
      };
      pointsService.charge.mockResolvedValue(charge);

      // 내역 기록
      const historyId = 1;
      const histories = [
        {
          id: historyId,
          userId: userId,
          type: '충전',
          amount: chargeAmount,
          timeMillis: charge.updateMillis,
        },
      ];
      pointsService.history.mockResolvedValue(histories);

      // 업데이트된 사용자 정보 반환
      const updatedUser = { ...user };
      pointsService.point.mockResolvedValueOnce(updatedUser);

      const fetchedUser = await pointsService.point(userId);
      expect(fetchedUser).not.toBeNull();

      const createdAmount = await pointsService.charge(userId, chargeAmount);
      expect(createdAmount).toHaveProperty('id', userId);
      expect(createdAmount).toHaveProperty('point', user.point);

      const createdHistory = await pointsService.history(userId);
      expect(createdHistory[0]).toHaveProperty('id', historyId);
      expect(createdHistory[0]).toHaveProperty('userId', userId);
      expect(createdHistory[0]).toHaveProperty('type', '충전');
      expect(createdHistory[0]).toHaveProperty('amount', chargeAmount);

      const finalUser = await pointsService.point(userId);
      expect(finalUser).toHaveProperty('id', userId);
      expect(finalUser).toHaveProperty('point', charge.point);
    });
  });

  describe('포인트 사용', () => {});

  describe('포인트 조회', () => {
    test('포인 잔액 확인하기', async () => {
      const id = 1;
      jest
        .spyOn(userPointTable, 'selectById')
        .mockResolvedValue({ id, point: 100, updateMillis: Date.now() });

      const result = await service.getPoint(id);

      expect(result.point).toBe(100);
      expect(userPointTable.selectById).toHaveBeenCalledWith(id);
    });
  });

  describe('포인트 내역 조회', () => {});
});
