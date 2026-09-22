import type { InvoiceDto, PlanDto, SubscriptionSummaryDto } from '@agendarhorario/contracts';
import { BillingPublicController, CompanyBillingController } from './billing.controller';
import type { BillingService } from './billing.service';

describe('BillingPublicController', () => {
  const listPlans = jest.fn<Promise<PlanDto[]>, []>();
  const billing = { listPlans } as unknown as BillingService;
  const controller = new BillingPublicController(billing);

  beforeEach(() => {
    listPlans.mockReset();
  });

  it('delegates listPlans to the billing service', async () => {
    const plans: PlanDto[] = [
      {
        id: 'p1',
        code: 'basico',
        name: 'Básico',
        priceBrl: 39.9,
        monthlyAppointmentLimit: 25,
        stripePriceId: 'price_1',
        sortOrder: 1,
        trialDays: 14,
      },
    ];
    listPlans.mockResolvedValue(plans);
    await expect(controller.listPlans()).resolves.toEqual(plans);
  });

  it('propagates listPlans failures', async () => {
    listPlans.mockRejectedValue(new Error('db down'));
    await expect(controller.listPlans()).rejects.toThrow('db down');
  });
});

describe('CompanyBillingController', () => {
  const getSubscriptionSummary = jest.fn<Promise<SubscriptionSummaryDto>, []>();
  const listInvoices = jest.fn<Promise<InvoiceDto[]>, []>();
  const createCheckoutSession = jest.fn<Promise<{ url: string }>, [string]>();
  const confirmCheckout = jest.fn<Promise<SubscriptionSummaryDto>, [string | undefined]>();
  const createPortalSession = jest.fn<Promise<{ url: string }>, []>();
  const changePlan = jest.fn<Promise<SubscriptionSummaryDto>, [string]>();
  const cancel = jest.fn<Promise<SubscriptionSummaryDto>, []>();

  const billing = {
    getSubscriptionSummary,
    listInvoices,
    createCheckoutSession,
    confirmCheckout,
    createPortalSession,
    changePlan,
    cancel,
  } as unknown as BillingService;

  const controller = new CompanyBillingController(billing);

  const summary: SubscriptionSummaryDto = {
    hasSubscription: false,
    plan: null,
    status: null,
    state: 'NO_SUBSCRIPTION',
    cancelAtPeriodEnd: false,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    trialEligible: true,
    trialEndsAt: null,
    trialDays: 14,
    usage: { used: 0, limit: 0, resetAt: null },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns subscription summary on success', async () => {
    getSubscriptionSummary.mockResolvedValue(summary);
    await expect(controller.subscription()).resolves.toEqual(summary);
  });

  it('propagates subscription summary errors', async () => {
    getSubscriptionSummary.mockRejectedValue(new Error('no tenant'));
    await expect(controller.subscription()).rejects.toThrow('no tenant');
  });

  it('lists invoices on success', async () => {
    listInvoices.mockResolvedValue([]);
    await expect(controller.invoices()).resolves.toEqual([]);
  });

  it('propagates invoice list errors', async () => {
    listInvoices.mockRejectedValue(new Error('fail'));
    await expect(controller.invoices()).rejects.toThrow('fail');
  });

  it('creates checkout session with plan code', async () => {
    createCheckoutSession.mockResolvedValue({ url: 'https://checkout' });
    await expect(controller.checkout({ planCode: 'basico' })).resolves.toEqual({
      url: 'https://checkout',
    });
    expect(createCheckoutSession).toHaveBeenCalledWith('basico');
  });

  it('propagates checkout failures', async () => {
    createCheckoutSession.mockRejectedValue(new Error('no price'));
    await expect(controller.checkout({ planCode: 'basico' })).rejects.toThrow('no price');
  });

  it('confirms checkout with optional session id', async () => {
    confirmCheckout.mockResolvedValue(summary);
    await expect(controller.confirmCheckout({ sessionId: 'cs_1' })).resolves.toEqual(summary);
    expect(confirmCheckout).toHaveBeenCalledWith('cs_1');
  });

  it('propagates confirm-checkout failures', async () => {
    confirmCheckout.mockRejectedValue(new Error('mismatch'));
    await expect(controller.confirmCheckout({})).rejects.toThrow('mismatch');
  });

  it('opens portal session on success', async () => {
    createPortalSession.mockResolvedValue({ url: 'https://portal' });
    await expect(controller.portal()).resolves.toEqual({ url: 'https://portal' });
  });

  it('propagates portal failures', async () => {
    createPortalSession.mockRejectedValue(new Error('no customer'));
    await expect(controller.portal()).rejects.toThrow('no customer');
  });

  it('changes plan on success', async () => {
    changePlan.mockResolvedValue(summary);
    await expect(controller.changePlan({ planCode: 'medio' })).resolves.toEqual(summary);
    expect(changePlan).toHaveBeenCalledWith('medio');
  });

  it('propagates change-plan failures', async () => {
    changePlan.mockRejectedValue(new Error('no sub'));
    await expect(controller.changePlan({ planCode: 'medio' })).rejects.toThrow('no sub');
  });

  it('cancels subscription on success', async () => {
    cancel.mockResolvedValue(summary);
    await expect(controller.cancel()).resolves.toEqual(summary);
  });

  it('propagates cancel failures', async () => {
    cancel.mockRejectedValue(new Error('no sub'));
    await expect(controller.cancel()).rejects.toThrow('no sub');
  });
});
