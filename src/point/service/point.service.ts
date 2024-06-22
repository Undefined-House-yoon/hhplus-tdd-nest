import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserPointTable } from '../../database/userpoint.table';
import { PointHistoryTable } from '../../database/pointhistory.table';
import { TransactionType, UserPoint } from '../model/point.model';
import { IPointService } from '../interfaces/point.interfaces';
import { Mutex } from 'async-mutex';

@Injectable()
export class PointService implements IPointService {
  private readonly mutex = new Mutex();

  constructor(
    private readonly userPointTable: UserPointTable,
    private readonly pointHistoryTable: PointHistoryTable,
  ) {}

  //동시성 문제 트랜잭션으로 처리
  chargePoint = async (id: number, amount: number) =>
    this.updateUserPoint(
      id,
      amount,
      TransactionType.CHARGE,
      (point, amount) => point + amount,
    );

  //동시성 문제 트랜잭션으로 처리
  usePoint = async (id: number, usePointAmount: number) =>
    this.updateUserPoint(
      id,
      usePointAmount,
      TransactionType.USE,
      (point, amount) => point - amount,
    );

  getPoint = async (id: number) => this.userPointTable.selectById(id);

  getPointHistory = async (id: number) =>
    this.pointHistoryTable.selectAllByUserId(id);

  private async updateUserPoint(
    id: number,
    amount: number,
    transactionType: TransactionType,
    operation: (point: number, amount: number) => number,
  ): Promise<UserPoint> {
    return this.mutex.runExclusive(async () => {
      const userPoint = await this.userPointTable.selectById(id);

      if (!userPoint) {
        throw new BadRequestException('User not found');
      }

      const originalPoint = userPoint.point;
      userPoint.point = operation(userPoint.point, amount);

      if (transactionType === TransactionType.USE && userPoint.point < 0) {
        await this.userPointTable.insertOrUpdate(id, originalPoint);
        throw new BadRequestException('Insufficient balance');
      }

      try {
        await this.userPointTable.insertOrUpdate(id, userPoint.point);
        await this.pointHistoryTable.insert(
          id,
          amount,
          transactionType,
          Date.now(),
        );
        return userPoint;
      } catch (err) {
        await this.userPointTable.insertOrUpdate(id, originalPoint);
        throw new InternalServerErrorException(
          'Transaction failed. Rolled back.',
        );
      }
    });
  }
}
