import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { BusinessHourDto, ReplaceBusinessHoursRequest, toMinutes } from '@agendarhorario/contracts';
import { TenantContextService } from '../../shared/tenant/tenant-context.service';
import { BusinessHour } from './business-hour.entity';

@Injectable()
export class BusinessHoursService {
  constructor(
    @InjectRepository(BusinessHour) private readonly repo: Repository<BusinessHour>,
    private readonly tenant: TenantContextService,
    private readonly dataSource: DataSource,
  ) {}

  async list(): Promise<BusinessHourDto[]> {
    const companyId = this.tenant.requireCompanyId();
    const items = await this.repo.find({
      where: { companyId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
    return items.map(toDto);
  }

  async replace(input: ReplaceBusinessHoursRequest): Promise<BusinessHourDto[]> {
    const companyId = this.tenant.requireCompanyId();
    validateNoOverlap(input.hours);
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(BusinessHour);
      await repo
        .createQueryBuilder()
        .delete()
        .from(BusinessHour)
        .where('companyId = :companyId', { companyId })
        .andWhere({ deletedAt: IsNull() })
        .execute();
      const fresh = repo.create(
        input.hours.map((h) => ({
          companyId,
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime,
          endTime: h.endTime,
        })),
      );
      const saved = await repo.save(fresh);
      return saved
        .sort(
          (a, b) => a.dayOfWeek - b.dayOfWeek || toMinutes(a.startTime) - toMinutes(b.startTime),
        )
        .map(toDto);
    });
  }
}

export const validateNoOverlap = (
  hours: { dayOfWeek: number; startTime: string; endTime: string }[],
): void => {
  const byDay = new Map<number, { startTime: string; endTime: string }[]>();
  for (const h of hours) {
    const list = byDay.get(h.dayOfWeek) ?? [];
    list.push({ startTime: h.startTime, endTime: h.endTime });
    byDay.set(h.dayOfWeek, list);
  }
  for (const [day, list] of byDay) {
    const sorted = [...list].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      if (toMinutes(sorted[i].startTime) < toMinutes(sorted[i - 1].endTime)) {
        throw new BadRequestException(
          `Intervalos sobrepostos no dia ${day}: ${sorted[i - 1].startTime}-${sorted[i - 1].endTime} e ${sorted[i].startTime}-${sorted[i].endTime}`,
        );
      }
    }
  }
};

const toDto = (entity: BusinessHour): BusinessHourDto => ({
  id: entity.id,
  dayOfWeek: entity.dayOfWeek,
  startTime: entity.startTime,
  endTime: entity.endTime,
});
