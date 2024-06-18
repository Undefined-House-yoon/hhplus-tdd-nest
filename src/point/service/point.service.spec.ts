import { PointService } from './point.service';
import { UserPointTable } from '../../database/userpoint.table';
import { Test, TestingModule } from '@nestjs/testing';
import { PointHistoryTable } from '../../database/pointhistory.table';
import { TransactionType } from '../model/point.model';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('PointService', () => {
  let service: PointService;
  let userPointTable: UserPointTable;
  let pointHistoryTable: PointHistoryTable;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointService,
        {
          provide: UserPointTable,
          useValue: {
            selectById: jest.fn(),
            insertOrUpdate: jest.fn(),
          },
        },
        {
          provide: PointHistoryTable,
          useValue: {
            insert: jest.fn(),
            selectAllByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PointService>(PointService);
    userPointTable = module.get<UserPointTable>(UserPointTable);
    pointHistoryTable = module.get<PointHistoryTable>(PointHistoryTable);
  });

  describe('포인트 충전', () => {
    it('포인트를 성공적으로 충전합니다', async () => {
      const userId = 1;
      const initialPoint = 100;
      const chargeAmount = 50;
      const updatedPoint = initialPoint + chargeAmount;

      const user = {
        id: userId,
        point: initialPoint,
        updateMillis: Date.now(),
      };

      jest.spyOn(userPointTable, 'selectById').mockResolvedValue(user);

      const result = await service.chargePoint(userId, chargeAmount);

      expect(result.point).toBe(updatedPoint);
      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
      expect(userPointTable.insertOrUpdate).toHaveBeenCalledWith(
        userId,
        updatedPoint,
      );
      expect(pointHistoryTable.insert).toHaveBeenCalledWith(
        userId,
        chargeAmount,
        TransactionType.CHARGE,
        expect.any(Number),
      );
    });

    it('포인트 충전 중 트랜잭션 오류 발생 시 롤백', async () => {
      const userId = 1;
      const initialPoint = 100;
      const chargeAmount = 50;

      const user = {
        id: userId,
        point: initialPoint,
        updateMillis: Date.now(),
      };

      jest.spyOn(userPointTable, 'selectById').mockResolvedValue(user);
      jest.spyOn(pointHistoryTable, 'insert').mockRejectedValue(new Error());

      await expect(service.chargePoint(userId, chargeAmount)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(userPointTable.insertOrUpdate).toHaveBeenCalledWith(
        userId,
        initialPoint,
      );
    });
  });

  describe('포인트 사용', () => {
    it('포인트를 성공적으로 사용합니다', async () => {
      const userId = 1;
      const initialPoint = 100;
      const useAmount = 50;
      const remainingPoint = initialPoint - useAmount;

      const user = {
        id: userId,
        point: initialPoint,
        updateMillis: Date.now(),
      };

      jest.spyOn(userPointTable, 'selectById').mockResolvedValue(user);

      const result = await service.usePoint(userId, useAmount);

      expect(result.point).toBe(remainingPoint);
      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
      expect(userPointTable.insertOrUpdate).toHaveBeenCalledWith(
        userId,
        remainingPoint,
      );
      expect(pointHistoryTable.insert).toHaveBeenCalledWith(
        userId,
        useAmount,
        TransactionType.USE,
        expect.any(Number),
      );
    });

    it('포인트 사용 중 잔액 부족 시 예외 처리', async () => {
      const userId = 1;
      const initialPoint = 50;
      const useAmount = 100;

      const user = {
        id: userId,
        point: initialPoint,
        updateMillis: Date.now(),
      };

      jest.spyOn(userPointTable, 'selectById').mockResolvedValue(user);

      await expect(service.usePoint(userId, useAmount)).rejects.toThrow(
        BadRequestException,
      );

      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
      expect(userPointTable.insertOrUpdate).not.toHaveBeenCalled();
    });
  });

  describe('포인트 조회', () => {
    it('포인트 잔액을 조회합니다', async () => {
      const userId = 1;
      const point = 100;

      jest
        .spyOn(userPointTable, 'selectById')
        .mockResolvedValue({ id: userId, point, updateMillis: Date.now() });

      const result = await service.getPoint(userId);

      expect(result.point).toBe(point);
      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
    });
  });

  describe('포인트 내역 조회', () => {
    it('포인트 사용 내역을 조회합니다', async () => {
      const userId = 1;
      const histories = [
        {
          id: 1,
          userId,
          amount: 50,
          type: TransactionType.CHARGE,
          timeMillis: Date.now(),
        },
      ];

      jest
        .spyOn(pointHistoryTable, 'selectAllByUserId')
        .mockResolvedValue(histories);

      const result = await service.getPointHistory(userId);

      expect(result).toEqual(histories);
      expect(pointHistoryTable.selectAllByUserId).toHaveBeenCalledWith(userId);
    });
  });
});
