import { TestBed } from '@angular/core/testing';
import type { DaySlotsDto } from '@agendarhorario/contracts';
import { BookingSlotPickerComponent } from './booking-slot-picker.component';

const days: DaySlotsDto[] = [
  {
    date: '2026-10-02',
    slots: [{ start: '2026-10-02T16:00:00.000Z', end: '2026-10-02T16:30:00.000Z' }],
  },
  { date: '2026-10-03', slots: [] },
];

describe('BookingSlotPickerComponent', () => {
  const setup = (selectedDate: string | null = null) => {
    const fixture = TestBed.createComponent(BookingSlotPickerComponent);
    fixture.componentRef.setInput('days', days);
    fixture.componentRef.setInput('selectedDate', selectedDate);
    fixture.detectChanges();
    return fixture;
  };

  it('uses the first day when none is selected and emits a date pick', () => {
    const fixture = setup();
    const dates: string[] = [];
    fixture.componentInstance.datePicked.subscribe((date) => dates.push(date));
    expect(fixture.componentInstance.activeDate()).toBe('2026-10-02');
    expect(fixture.componentInstance.activeSlots()).toEqual(days[0].slots);
    fixture.nativeElement.querySelector('.day').click();
    expect(dates).toEqual(['2026-10-02']);
  });

  it('shows an empty day and emits the chosen slot', () => {
    const fixture = setup('2026-10-03');
    const slots: string[] = [];
    fixture.componentInstance.slotPicked.subscribe((slot) => slots.push(slot.start));
    expect(fixture.componentInstance.activeSlots()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Sem horários neste dia.');

    fixture.componentRef.setInput('selectedDate', '2026-10-02');
    fixture.componentRef.setInput('selectedStart', days[0].slots[0].start);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.time').click();
    fixture.nativeElement.querySelector('.confirm').click();
    expect(slots).toEqual([days[0].slots[0].start]);
  });

  it('returns no date when there are no days', () => {
    const fixture = TestBed.createComponent(BookingSlotPickerComponent);
    fixture.componentRef.setInput('days', []);
    fixture.detectChanges();
    expect(fixture.componentInstance.activeDate()).toBeNull();
    expect(fixture.componentInstance.activeSlots()).toEqual([]);
  });

  it('returns no slots when the selected date is missing', () => {
    const fixture = setup('2026-10-04');
    expect(fixture.componentInstance.activeSlots()).toEqual([]);
  });
});
