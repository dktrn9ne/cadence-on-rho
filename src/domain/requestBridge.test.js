import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestPaymentPlan, requestOutcome, requestPlanId } from './requestBridge.js';
import { createInstallmentDispatcher } from '../services/installmentDispatcher.js';
import { getInstallmentAmount } from './schedule.js';
import { RLUSD_CURRENCY, RLUSD_ISSUER, SOURCE_TAG } from './xrpl-constants.js';
const payer='rEfcBKrxNp8mxL4xu46R5wL3ex4dpDE864';
const destination='rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De';
const request={id:'request-1',payer,destination,rail:'rlusd',status:'pending',amount:2500};
beforeEach(()=>localStorage.clear());
describe('worker request to existing payment engine',()=>{
  it('creates exactly one non-scheduled installment with the pinned identity',()=>{
    const plan=requestPaymentPlan(request,payer);
    expect(plan.frequency).toBe('week');
    expect(plan.nextRunAt).toBeNull();
    expect(getInstallmentAmount(plan)).toBe('25.000000');
    expect(plan.payer).toBe(payer);expect(plan.address).toBe(destination);
    expect(()=>requestPaymentPlan({...request,rail:'usd'},payer)).toThrow('eligible');
    expect(()=>requestPaymentPlan({...request,destination:'not-valid'},payer)).toThrow('valid');
    expect(()=>requestPaymentPlan(request,destination)).toThrow('Reconnect');
  });
  it('settles through the real dispatcher and refuses duplicate dispatch',async()=>{
    let plans=[requestPaymentPlan(request,payer)];
    const hash='A'.repeat(64);
    const tx={validated:true,Account:payer,Destination:destination,Amount:{currency:RLUSD_CURRENCY,issuer:RLUSD_ISSUER,value:'25.000000'},SourceTag:SOURCE_TAG,meta:{TransactionResult:'tesSUCCESS'}};
    const submit=vi.fn(async()=>({hash,result:tx}));
    const dispatcher=createInstallmentDispatcher({getPlans:()=>plans,setPlans:next=>{plans=next;},submit,reconcile:async()=>({outcome:'validated_success',tx})});
    await dispatcher.dispatchInstallment(plans[0],0,'manual',{amount:'25.000000',payer});
    expect(requestOutcome(request,plans)).toBe('paid');
    await dispatcher.dispatchInstallment(plans[0],0,'manual',{amount:'25.000000',payer});
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it('retains a reservation for uncertain or mismatched payment evidence',()=>{
    const plan=requestPaymentPlan(request,payer);
    plan.attempts={first:{sequence:0,attemptNo:1,status:'unresolved'}};
    expect(requestOutcome(request,[plan])).toBe('unknown');
    expect(requestOutcome(request,[{...plan,weeklyPay:'2500.00'}])).toBe('unknown');
    expect(requestPlanId(request)).toBe(plan.id);
  });
});
