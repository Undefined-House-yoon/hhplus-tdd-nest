import { PointHistory, TransactionType, UserPoint } from '../model/point.model';

export interface IUserPointTable {
  getUserPoint(userId: number): Promise<UserPoint>;

  updateUserPoint(userId: number, amount: number): Promise<UserPoint>;
}

export interface IPointHistoryTable {
  getUserHistory(userId: number): Promise<PointHistory[]>;

  addHistory(
    userId: number,
    type: TransactionType,
    amount: number,
  ): Promise<PointHistory>;
}

export interface IPointService {
  getPoint(userId: number): Promise<UserPoint>;

  getHistory(userId: number): Promise<PointHistory[]>;

  chargePoint(userId: number, amount: number): Promise<UserPoint>;

  usePoint(userId: number, amount: number): Promise<UserPoint>;
}
