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
      //given 초기 상태를 설정
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
      // when 테스트의 동작 부분
      //chargePoint 메서드를 호출하여 포인트를 충전
      const result = await service.chargePoint(userId, chargeAmount);
      // then
      // 예상되는 결과값 확인
      /*기능 테스트*/
      expect(result.point).toBe(updatedPoint); // 충전 후 포인트가 예상값과 같은지 확인
      /*데이터 신뢰성 테스트*/
      expect(userPointTable.selectById).toHaveBeenCalledWith(userId); // selectById 메서드가 올바르게 호출되었는지 확인
      expect(userPointTable.insertOrUpdate).toHaveBeenCalledWith(
        userId,
        updatedPoint,
      ); // insertOrUpdate 메서드가 올바르게 호출되었는지 확인
      expect(pointHistoryTable.insert).toHaveBeenCalledWith(
        userId,
        chargeAmount,
        TransactionType.CHARGE,
        expect.any(Number),
      ); // insert 메서드가 올바르게 호출되었는지 확인
    });

    it('포인트 충전 중 트랜잭션 오류 발생 시 롤백', async () => {
      //given 초기 포인트만 나오면 됩니다
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
      //when 충전하다가 터뜨림
      await expect(service.chargePoint(userId, chargeAmount)).rejects.toThrow(
        InternalServerErrorException,
      );
      //then 초기 포인트값이 들어와야함
      expect(userPointTable.insertOrUpdate).toHaveBeenCalledWith(
        userId,
        initialPoint,
      );
      expect((await userPointTable.selectById(userId)).point).toBe(user.point);
    }); // 그래서 지금 유저포인트는 초기 값인가?
  });

  describe('포인트 사용', () => {
    it('포인트를 성공적으로 사용합니다', async () => {
      //given 초기값에서 50만큼 사용
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
      //when 포인트 사용
      const result = await service.usePoint(userId, useAmount);
      //then 초기값 - 사용한 포인트
      expect(result.point).toBe(remainingPoint);
      /*데이터 신뢰성 테스트 */
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
      //given 포인트 보다 사용량이 많을때
      const userId = 1;
      const initialPoint = 50;
      const useAmount = 100;

      const user = {
        id: userId,
        point: initialPoint,
        updateMillis: Date.now(),
      };

      jest.spyOn(userPointTable, 'selectById').mockResolvedValue(user);
      //when 에러발생
      await expect(service.usePoint(userId, useAmount)).rejects.toThrow(
        BadRequestException,
      );
      //then insertOrUpdate 호출 되었다면 실패
      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
      expect(userPointTable.insertOrUpdate).not.toHaveBeenCalled();
    });
  });

  describe('포인트 조회', () => {
    it('포인트 잔액을 조회합니다', async () => {
      //given 잔액
      const userId = 1;
      const point = 100;

      jest
        .spyOn(userPointTable, 'selectById')
        .mockResolvedValue({ id: userId, point, updateMillis: Date.now() });
      //when 잔액 조회
      const result = await service.getPoint(userId);
      //then 잔액 조회
      expect(result.point).toBe(point);
      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
    });
  });

  describe('포인트 내역 조회', () => {
    it('포인트 사용 내역을 조회합니다', async () => {
      //given
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
      //when 1 번 유저의 사용 내역 불러오기
      const result = await service.getPointHistory(userId);
      //then 불러 왔는가?
      expect(result).toEqual(histories);
      expect(pointHistoryTable.selectAllByUserId).toHaveBeenCalledWith(userId);
    });
  });
});
