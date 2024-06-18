import { BadRequestException, Injectable } from '@nestjs/common';
import { UserPointTable } from '../../database/userpoint.table';
import { PointHistoryTable } from '../../database/pointhistory.table';
import { TransactionType } from '../model/point.model';

@Injectable()
export class PointService {
  constructor(
    private readonly userPointTable: UserPointTable,
    private readonly pointHistoryTable: PointHistoryTable,
  ) {}

  async chargePoint(id: number, amount: number) {
    const userPoint = await this.userPointTable.selectById(id);
    userPoint.point += amount;
    await this.userPointTable.insertOrUpdate(id, userPoint.point);
    await this.pointHistoryTable.insert(
      id,
      amount,
      TransactionType.CHARGE,
      Date.now(),
    );
    return userPoint;
  }

  async usePoint(id: number, usePointAmount: number) {
    const userPoint = await this.userPointTable.selectById(id);
    if (userPoint.point < usePointAmount) {
      throw new BadRequestException('Insufficient balance');
    }
    userPoint.point -= usePointAmount;
    await this.userPointTable.insertOrUpdate(id, userPoint.point);
    await this.pointHistoryTable.insert(
      id,
      usePointAmount,
      TransactionType.USE,
      Date.now(),
    );
    return userPoint;
  }

  async getPoint(id: number) {
    return this.userPointTable.selectById(id);
  }

  async getPointHistories(id: number) {
    return this.pointHistoryTable.selectAllByUserId(id);
  }
}
